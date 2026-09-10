"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** Snapshots the project's real current scope and dates — this used to
 * insert `{}` for every snapshot column, so a "baseline" was an empty
 * placeholder row with nothing to ever measure variance against. Effort
 * stays `{}`: this app has no time/hours-tracking data model anywhere
 * else to snapshot from, so faking a number here would be worse than
 * admitting it's not tracked yet. */
async function captureSnapshots(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const [{ data: project }, { data: tasks }, { data: phases }, { data: gates }] = await Promise.all([
    supabase.from("projects").select("name, description, go_live_target").eq("id", projectId).maybeSingle(),
    supabase.from("project_tasks").select("ref, title, status, is_critical_path").eq("project_id", projectId),
    supabase.from("project_phases").select("code, name, index, started_at, completed_at").eq("project_id", projectId).order("index"),
    supabase.from("project_gates").select("code, name, sequence, status, target_date").eq("project_id", projectId).order("sequence"),
  ]);

  return {
    scope_snapshot: {
      description: project?.description ?? null,
      tasks: tasks ?? [],
    },
    dates_snapshot: {
      go_live_target: project?.go_live_target ?? null,
      phases: phases ?? [],
      gates: gates ?? [],
    },
    effort_snapshot: {},
  };
}

/** Creates the next baseline version (v1 if none exist yet, v2 after
 * that, and so on) — this used to be hardcoded to "v1" and the page only
 * ever offered the button while zero baselines existed, so there was no
 * way to re-baseline after a change request actually moved scope or
 * dates. "Vs the first approved baseline" (the page's own Date variance
 * copy) only means anything once a second version exists to compare
 * against the first — a lone v1 always shows +0d against itself. */
export async function createNextBaseline(projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { count: existingCount } = await supabase
    .from("baselines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const version = `v${(existingCount ?? 0) + 1}`;

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  const snapshots = await captureSnapshots(supabase, projectId);

  const { error } = await supabase.from("baselines").insert({
    project_id: projectId,
    version,
    status: "draft",
    ...snapshots,
  });
  if (error) throw new Error(error.message);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "baseline_created",
      title: `Baseline ${version} created: ${project?.name ?? projectRef}`,
      body: `${person.full_name} created a draft ${version} baseline on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/baselines`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/baselines`);
  revalidatePath(base);
  revalidatePath("/delivery");
  revalidatePath("/");
}

/** Approves a draft baseline — the step that was entirely missing: every
 * baseline stayed "draft" forever with no path to "approved", so the
 * page's own "CURRENT" tile (`baselines.find(b => b.status ===
 * 'approved')`) and the Compare button never had anything real to show.
 * Any previously-approved baseline on this project is marked
 * "superseded" first, since the page treats "approved" as a single
 * current version, not a history of several. variance_days is the go-live
 * date drift in days against the FIRST-ever approved baseline on this
 * project (page copy: "Vs the first approved baseline") — v1 approving
 * itself is always 0. */
export async function approveBaseline(baselineId: string, projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: baseline } = await supabase
    .from("baselines")
    .select("version, dates_snapshot")
    .eq("id", baselineId)
    .maybeSingle();
  if (!baseline) throw new Error("Baseline not found.");

  const { data: firstApproved } = await supabase
    .from("baselines")
    .select("dates_snapshot")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("approved_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let varianceDays: number | null = 0;
  const firstGoLive = (firstApproved?.dates_snapshot as { go_live_target?: string | null } | null)?.go_live_target;
  const thisGoLive = (baseline.dates_snapshot as { go_live_target?: string | null } | null)?.go_live_target;
  if (firstGoLive && thisGoLive) {
    const days = Math.round((new Date(thisGoLive).getTime() - new Date(firstGoLive).getTime()) / 86_400_000);
    varianceDays = days;
  }

  const { error: supersedeError } = await supabase
    .from("baselines")
    .update({ status: "superseded" })
    .eq("project_id", projectId)
    .eq("status", "approved");
  if (supersedeError) throw new Error(supersedeError.message);

  const { error } = await supabase
    .from("baselines")
    .update({ status: "approved", approved_by: person.id, approved_at: new Date().toISOString(), variance_days: varianceDays })
    .eq("id", baselineId);
  if (error) throw new Error(error.message);

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "baseline_approved",
      title: `Baseline ${baseline.version} approved: ${project?.name ?? projectRef}`,
      body: `${person.full_name} approved baseline ${baseline.version} on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/baselines`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/baselines`);
  revalidatePath(base);
}
