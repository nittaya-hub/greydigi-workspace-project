"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import * as dashboards from "@/lib/dashboard/service";
import type { DashboardBlockType } from "@/lib/supabase/database.types";

export async function getProjectDashboard(projectId: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  return dashboards.getOrCreateDashboard(supabase, person.workspace_id, { space: "delivery", projectId });
}

export async function addProjectDashboardBlock(projectRef: string, dashboardId: string, blockType: DashboardBlockType) {
  const supabase = await createClient();
  await dashboards.addBlock(supabase, dashboardId, blockType);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
}

export async function updateProjectDashboardBlockConfig(projectRef: string, blockId: string, config: Record<string, unknown>) {
  const supabase = await createClient();
  await dashboards.updateBlockConfig(supabase, blockId, config);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
}

export async function updateProjectDashboardLayout(
  projectRef: string,
  layout: { id: string; x: number; y: number; w: number; h: number }[]
) {
  const supabase = await createClient();
  await dashboards.updateBlockLayout(supabase, layout);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
}

export async function removeProjectDashboardBlock(projectRef: string, blockId: string) {
  const supabase = await createClient();
  await dashboards.removeBlock(supabase, blockId);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
}

export async function publishProjectDashboard(projectRef: string, dashboardId: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, person.id);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
}

export async function unpublishProjectDashboard(projectRef: string, dashboardId: string) {
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, null);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-dashboard`);
  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
}
