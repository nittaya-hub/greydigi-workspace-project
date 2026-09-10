"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWorkspaceAdmin, getCurrentPerson } from "@/lib/data/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyWorkspace } from "@/lib/data/notify";

export interface PortalAccessResult {
  ok: boolean;
  message: string;
  temporaryPassword?: string;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function generatePassword() {
  // Same scheme as people/invite/actions.ts: 12 random bytes -> 16-char
  // base64url string, shown once in this modal's success state.
  return randomBytes(12).toString("base64url");
}

/** Creates (or reuses) a client-portal login for a contact and links it to
 * this client via client_roles — mirrors people/invite/actions.ts, but for
 * a client-kind person instead of an internal member, following the same
 * find-or-create shape scripts/create-admin.mjs uses for client grants. */
export async function grantPortalAccess(clientId: string, formData: FormData): Promise<PortalAccessResult> {
  let admin;
  try {
    admin = await requireWorkspaceAdmin();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not authorized." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName) return { ok: false, message: "Enter a full name." };
  if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid email address." };

  const password = generatePassword();
  const supabaseAdmin = createAdminClient();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let authUserId: string;
  if (created?.user) {
    authUserId = created.user.id;
  } else if (
    createError?.message?.toLowerCase().includes("already been registered") ||
    createError?.message?.toLowerCase().includes("already registered")
  ) {
    // Already exists — reuse the auth user (same recovery path as
    // scripts/create-admin.mjs) rather than failing the whole flow.
    const { data: page, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return { ok: false, message: listError.message };
    const existing = page.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) return { ok: false, message: "Could not find the existing account for this email." };
    authUserId = existing.id;
  } else {
    return { ok: false, message: createError?.message ?? "Could not create the account." };
  }

  const { data: existingPerson } = await supabaseAdmin
    .from("people")
    .select("id")
    .eq("workspace_id", admin.workspace_id)
    .eq("email", email)
    .maybeSingle();

  let personId: string;
  if (existingPerson) {
    const { error } = await supabaseAdmin
      .from("people")
      .update({ auth_user_id: authUserId, full_name: fullName, kind: "client", workspace_role: "client" })
      .eq("id", existingPerson.id);
    if (error) return { ok: false, message: error.message };
    personId = existingPerson.id;
  } else {
    const { data: personCreated, error } = await supabaseAdmin
      .from("people")
      .insert({
        workspace_id: admin.workspace_id,
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        kind: "client",
        avatar_initials: initialsFrom(fullName),
        workspace_role: "client",
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    personId = personCreated.id;
  }

  const { data: existingGrant } = await supabaseAdmin
    .from("client_roles")
    .select("id")
    .eq("person_id", personId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!existingGrant) {
    const { error } = await supabaseAdmin.from("client_roles").insert({ person_id: personId, client_id: clientId });
    if (error) return { ok: false, message: error.message };
  }

  const supabase = await createClient();
  await supabase.rpc("fn_log_activity", {
    p_workspace_id: admin.workspace_id,
    p_actor_person_id: admin.id,
    p_space: null,
    p_action: "invite",
    p_entity_type: "people",
    p_entity_id: authUserId,
    p_summary: `${fullName} granted portal access`,
    p_metadata: {},
  });

  const { data: clientRow } = await supabaseAdmin.from("clients").select("name").eq("id", clientId).maybeSingle();
  await notifyWorkspace(
    admin.workspace_id,
    {
      kind: "portal_access_granted",
      title: `Portal access granted: ${fullName}`,
      body: `${admin.full_name} granted ${fullName} portal access to ${clientRow?.name ?? "a client"}.`,
      relatedUrl: `/clients/${clientId}`,
    },
    { excludePersonId: admin.id }
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");

  return {
    ok: true,
    message: `${fullName} was granted portal access. Share this temporary password with them securely — it won't be shown again.`,
    temporaryPassword: password,
  };
}

/** Creates a project scoped to this client from a template, then clones the
 * template's phases and gates into the new project (see
 * supabase/seed_nk_live.sql for the insert shape this replicates). */
export async function createProjectForClient(clientId: string, formData: FormData) {
  const templateVersionId = String(formData.get("templateVersionId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const ref = String(formData.get("ref") ?? "").trim();
  const leadPersonId = String(formData.get("leadPersonId") ?? "").trim() || null;
  const goLiveTarget = String(formData.get("goLiveTarget") ?? "").trim() || null;

  if (!templateVersionId) throw new Error("Choose a template.");
  if (!name) throw new Error("Name is required.");
  if (!ref) throw new Error("Ref is required.");

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: person.workspace_id,
      client_id: clientId,
      ref,
      name,
      template_version_id: templateVersionId,
      lead_person_id: leadPersonId,
      go_live_target: goLiveTarget,
    })
    .select("id")
    .single();
  if (projectError || !project) throw new Error(projectError?.message ?? "Could not create the project.");

  // Clone template_phases -> project_phases, remembering the old -> new
  // phase id mapping so gates can be re-pointed at the copied phases.
  const { data: templatePhases } = await supabase
    .from("template_phases")
    .select("id, index, code, name")
    .eq("template_version_id", templateVersionId)
    .order("index");

  const phaseIdMap = new Map<string, string>();
  if (templatePhases && templatePhases.length > 0) {
    const { data: insertedPhases, error: phasesError } = await supabase
      .from("project_phases")
      .insert(
        templatePhases.map((p) => ({
          project_id: project.id,
          template_phase_id: p.id,
          index: p.index,
          code: p.code,
          name: p.name,
        }))
      )
      .select("id, index");
    if (phasesError) throw new Error(phasesError.message);

    const newIdByIndex = new Map((insertedPhases ?? []).map((p) => [p.index, p.id]));
    for (const p of templatePhases) {
      const newId = newIdByIndex.get(p.index);
      if (newId) phaseIdMap.set(p.id, newId);
    }
  }

  // Clone template_gates -> project_gates, pointed at the new phase ids.
  const { data: templateGates } = await supabase
    .from("template_gates")
    .select("id, template_phase_id, code, name, sequence")
    .eq("template_version_id", templateVersionId)
    .order("sequence");

  if (templateGates && templateGates.length > 0) {
    const gatesToInsert = templateGates
      .map((g) => {
        const projectPhaseId = phaseIdMap.get(g.template_phase_id);
        if (!projectPhaseId) return null;
        return {
          project_id: project.id,
          project_phase_id: projectPhaseId,
          template_gate_id: g.id,
          code: g.code,
          name: g.name,
          sequence: g.sequence,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
    if (gatesToInsert.length > 0) {
      const { error: gatesError } = await supabase.from("project_gates").insert(gatesToInsert);
      if (gatesError) throw new Error(gatesError.message);
    }
  }

  // Clone template_tasks -> project_tasks the same way phases/gates were
  // just cloned above -- without this, a project starts with an empty
  // Tasks and milestones tab, and any task added by hand has no phase to
  // group under ("Phase — Unassigned") since there's no default checklist
  // at all. Mirrors src/app/(app)/delivery/projects/actions.ts::createProject.
  const { data: templateTasks } = await supabase
    .from("template_tasks")
    .select("template_phase_id, title, is_critical_path")
    .eq("template_version_id", templateVersionId);

  if (templateTasks && templateTasks.length > 0) {
    const phaseIndexByTemplatePhase = new Map((templatePhases ?? []).map((p) => [p.id, p.index]));
    const orderedTasks = [...templateTasks].sort((a, b) => {
      const ai = phaseIndexByTemplatePhase.get(a.template_phase_id) ?? 0;
      const bi = phaseIndexByTemplatePhase.get(b.template_phase_id) ?? 0;
      return ai - bi;
    });

    const tasksToInsert = orderedTasks
      .map((t, i) => {
        const projectPhaseId = phaseIdMap.get(t.template_phase_id);
        if (!projectPhaseId) return null;
        return {
          project_id: project.id,
          project_phase_id: projectPhaseId,
          ref: `${ref}-T${String(i + 1).padStart(2, "0")}`,
          title: t.title,
          is_critical_path: t.is_critical_path,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase.from("project_tasks").insert(tasksToInsert);
      if (tasksError) throw new Error(tasksError.message);
    }
  }

  const { data: clientRow } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "project_created",
      title: `New project: ${name}`,
      body: `${person.full_name} created ${ref} ${name} for ${clientRow?.name ?? "a client"}.`,
      relatedUrl: `/delivery/projects/${ref.toLowerCase()}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/delivery/projects");
  revalidatePath("/delivery");
  revalidatePath("/");
}

/** Per-client HyperCare gate — for clients who haven't purchased HyperCare.
 * Nav/portal both check this, not just "does a service exist," since a
 * client can be mid-onboarding with no service yet but HyperCare still on. */
export async function toggleHypercareEnabled(clientId: string, enabled: boolean) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const { data: client, error } = await supabase
    .from("clients")
    .update({ hypercare_enabled: enabled })
    .eq("id", clientId)
    .select("name")
    .single();
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "hypercare_toggled",
      title: `HyperCare ${enabled ? "enabled" : "disabled"}: ${client.name}`,
      body: `${person.full_name} ${enabled ? "enabled" : "disabled"} HyperCare for ${client.name}.`,
      relatedUrl: `/clients/${clientId}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/hypercare");
}
