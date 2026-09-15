"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { ManifestAssetKind } from "@/lib/supabase/database.types";

export async function createAsset(formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim() as ManifestAssetKind;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) throw new Error("Name is required.");
  if (!kind) throw new Error("Kind is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("manifest_assets").insert({
    workspace_id: person.workspace_id,
    name,
    kind,
    description,
    created_by_person_id: person.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/manifest");
  revalidatePath("/manifest/assets");
  revalidatePath("/");
}

/** Registers a reuse of an existing asset on a mission — the only thing
 * that moves reuse_count (the trigger, not this function; see
 * 0062_manifest.sql). */
export async function logAssetUsage(assetId: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const projectId = String(formData.get("projectId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!projectId) throw new Error("Mission is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("manifest_asset_usages").insert({
    workspace_id: person.workspace_id,
    asset_id: assetId,
    project_id: projectId,
    note,
    logged_by_person_id: person.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/manifest");
  revalidatePath("/manifest/assets");
  revalidatePath("/");
}

export async function createDecision(formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const projectId = String(formData.get("projectId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const objection = String(formData.get("objection") ?? "").trim() || null;
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!projectId) throw new Error("Mission is required.");
  if (!decision) throw new Error("Decision is required.");
  if (!resolution) throw new Error("Resolution is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("manifest_decisions").insert({
    workspace_id: person.workspace_id,
    project_id: projectId,
    decision,
    objection,
    resolution,
    created_by_person_id: person.id,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "manifest_decision_logged",
      title: "Decision logged to Manifest",
      body: `${person.full_name} logged a decision: ${decision}`,
      relatedUrl: "/manifest/decisions",
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/manifest");
  revalidatePath("/manifest/decisions");
  revalidatePath("/");
}
