"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import * as dashboards from "@/lib/dashboard/service";
import type { DashboardBlockType } from "@/lib/supabase/database.types";

export async function getClientDashboard(clientId: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  return dashboards.getOrCreateDashboard(supabase, person.workspace_id, { space: "hypercare", clientId });
}

export async function addClientDashboardBlock(clientId: string, dashboardId: string, blockType: DashboardBlockType) {
  const supabase = await createClient();
  await dashboards.addBlock(supabase, dashboardId, blockType);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
}

export async function updateClientDashboardBlockConfig(clientId: string, blockId: string, config: Record<string, unknown>) {
  const supabase = await createClient();
  await dashboards.updateBlockConfig(supabase, blockId, config);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
}

export async function updateClientDashboardLayout(
  clientId: string,
  layout: { id: string; x: number; y: number; w: number; h: number }[]
) {
  const supabase = await createClient();
  await dashboards.updateBlockLayout(supabase, layout);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
}

export async function removeClientDashboardBlock(clientId: string, blockId: string) {
  const supabase = await createClient();
  await dashboards.removeBlock(supabase, blockId);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
}

export async function publishClientDashboard(clientId: string, dashboardId: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, person.id);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
  revalidatePath("/portal");
}

export async function unpublishClientDashboard(clientId: string, dashboardId: string) {
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, null);
  revalidatePath(`/clients/${clientId}/client-dashboard`);
  revalidatePath("/portal");
}
