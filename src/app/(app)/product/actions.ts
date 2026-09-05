"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { RoadmapItemStatus } from "@/lib/supabase/database.types";

/** Creates a new roadmap_items row of kind 'feature' (see product/features/page.tsx
 * and src/lib/data/product.ts::listFeatures — the Features screen reads roadmap_items
 * directly, there is no dedicated features table per migration 0004_product.sql). */
export async function createFeature(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) throw new Error("Product is required.");

  const status = String(formData.get("status") ?? "forecast").trim() as RoadmapItemStatus;
  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: product } = await supabase.from("products").select("id, workspace_id, name").eq("id", productId).maybeSingle();
  if (!product) throw new Error("Product not found.");

  // Ref generated workspace-wide (not per-product) to match the FT-1xx style
  // numbering used across the demo data, rather than restarting at 001 per product.
  const { data: siblingProducts } = await supabase.from("products").select("id").eq("workspace_id", product.workspace_id);
  const productIds = (siblingProducts ?? []).map((p) => p.id);
  const { data: existing } = productIds.length
    ? await supabase.from("roadmap_items").select("ref").in("product_id", productIds)
    : { data: [] as { ref: string }[] };
  const maxNum = (existing ?? []).reduce((max, r) => {
    const match = r.ref.match(/(\d+)\s*$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  const ref = `FT-${String(maxNum + 1).padStart(3, "0")}`;

  const { error } = await supabase.from("roadmap_items").insert({
    product_id: productId,
    ref,
    title,
    description,
    kind: "feature",
    status,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    product.workspace_id,
    {
      kind: "feature_created",
      title: `${ref} created: ${title}`,
      body: `${person?.full_name ?? "Someone"} added a new feature to ${product.name}.`,
      relatedUrl: `/product/features/${ref.toLowerCase()}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/product");
  revalidatePath("/product/features");
  revalidatePath("/product/roadmap");
  revalidatePath("/");
}

/** Flags a roadmap item (feature) visible/hidden on the client portal —
 * roadmap_items.client_visible, a workspace-wide setting on the item
 * itself, unrelated to any single project's client-view-config. Follows
 * the same actor/write/notify/revalidate shape as
 * client-view-config/actions.ts::toggleClientViewField. */
export async function toggleFeatureClientVisible(itemId: string, itemRef: string, nextValue: boolean) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: item } = await supabase
    .from("roadmap_items")
    .select("title, product_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Feature not found.");

  const { data: product } = await supabase.from("products").select("workspace_id").eq("id", item.product_id).maybeSingle();
  if (!product) throw new Error("Product not found.");

  const { error } = await supabase.from("roadmap_items").update({ client_visible: nextValue }).eq("id", itemId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    product.workspace_id,
    {
      kind: "feature_client_visibility_toggled",
      title: `${itemRef} ${nextValue ? "shown to" : "hidden from"} clients`,
      body: `${person?.full_name ?? "Someone"} turned client visibility ${nextValue ? "on" : "off"} for ${item.title}.`,
      relatedUrl: `/product/features/${itemRef.toLowerCase()}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/product/features");
  revalidatePath(`/product/features/${itemRef.toLowerCase()}`);
  revalidatePath("/product/roadmap");
}
