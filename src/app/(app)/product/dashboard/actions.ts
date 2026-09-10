"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import * as dashboards from "@/lib/dashboard/service";
import type { DashboardBlockType } from "@/lib/supabase/database.types";

export async function getProductDashboard() {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  return dashboards.getOrCreateDashboard(supabase, person.workspace_id, { space: "product" });
}

export async function addProductDashboardBlock(dashboardId: string, blockType: DashboardBlockType) {
  const supabase = await createClient();
  await dashboards.addBlock(supabase, dashboardId, blockType);
  revalidatePath("/product/dashboard");
}

export async function updateProductDashboardBlockConfig(blockId: string, config: Record<string, unknown>) {
  const supabase = await createClient();
  await dashboards.updateBlockConfig(supabase, blockId, config);
  revalidatePath("/product/dashboard");
}

export async function updateProductDashboardLayout(layout: { id: string; x: number; y: number; w: number; h: number }[]) {
  const supabase = await createClient();
  await dashboards.updateBlockLayout(supabase, layout);
  revalidatePath("/product/dashboard");
}

export async function removeProductDashboardBlock(blockId: string) {
  const supabase = await createClient();
  await dashboards.removeBlock(supabase, blockId);
  revalidatePath("/product/dashboard");
}

export async function publishProductDashboard(dashboardId: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, person.id);
  revalidatePath("/product/dashboard");
  revalidatePath("/portal");
}

export async function unpublishProductDashboard(dashboardId: string) {
  const supabase = await createClient();
  await dashboards.setDashboardPublished(supabase, dashboardId, null);
  revalidatePath("/product/dashboard");
  revalidatePath("/portal");
}
