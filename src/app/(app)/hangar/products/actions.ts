"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson, requireHangarLead } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import { nextProductStageGate } from "@/lib/data/product";
import type { ProductTrack } from "@/lib/supabase/database.types";

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  const description = String(formData.get("description") ?? "").trim() || null;
  const deliveryTemplateVersionId = String(formData.get("deliveryTemplateVersionId") ?? "").trim() || null;

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    workspace_id: person.workspace_id,
    name,
    description,
    delivery_template_version_id: deliveryTemplateVersionId,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "product_created",
      title: `Product created: ${name}`,
      body: `${person.full_name} added a new product.`,
      relatedUrl: "/hangar/products",
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/hangar/products");
  revalidatePath("/hangar");
  revalidatePath("/");
}

/** Attaches (or clears, with an empty value) the delivery template a
 * sale of this product instantiates as a mission -- for a product that
 * already existed before this field did. */
export async function setProductDeliveryTemplate(productId: string, templateVersionId: string | null) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ delivery_template_version_id: templateVersionId })
    .eq("id", productId)
    .eq("workspace_id", person.workspace_id);
  if (error) throw new Error(error.message);

  revalidatePath("/hangar/products");
}

/** Classifies a product Platform or Market (Decision Pack, "Two
 * development tracks, two sets of gates"). Only Market-track products
 * are gated G1-G5 — Platform ones have no external customer or launch
 * date to gate against. */
export async function setProductTrack(productId: string, track: ProductTrack | null) {
  const person = await requireHangarLead();
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ track }).eq("id", productId).eq("workspace_id", person.workspace_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/hangar/products/${productId}`);
  revalidatePath("/hangar/products");
}

/** Saves whichever gate-evidence fields the form included — business
 * case (G1), build scope/kill criteria (G2), design partner (G3),
 * pricing/collateral/support model (G4). One action for all four sets of
 * fields since they're edited from the same product detail page and
 * never need separate permission rules from each other. */
export async function updateProductGateEvidence(productId: string, formData: FormData) {
  const person = await requireHangarLead();
  const supabase = await createClient();

  const str = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const { error } = await supabase
    .from("products")
    .update({
      business_case_problem: str("businessCaseProblem"),
      business_case_buyer: str("businessCaseBuyer"),
      business_case_price: str("businessCasePrice"),
      business_case_size: str("businessCaseSize"),
      build_scope: str("buildScope"),
      kill_criteria: str("killCriteria"),
      design_partner_project_id: str("designPartnerProjectId"),
      design_partner_outcome: str("designPartnerOutcome"),
      pricing: str("pricing"),
      collateral_url: str("collateralUrl"),
      support_model: str("supportModel"),
    })
    .eq("id", productId)
    .eq("workspace_id", person.workspace_id);
  if (error) throw new Error(error.message);

  revalidatePath(`/hangar/products/${productId}`);
}

/** Advances a Market-track product to its next stage gate — G1 through
 * G5, in order, one step at a time (no skipping). Writes a permanent row
 * to product_gate_history: this IS Hangar's half of "no gate closes
 * without a write-back" (Decision Pack, page 7), the same way clearing a
 * Missions gate writes to manifest_calibration automatically. Restricted
 * to the Hangar lead or a workspace admin, since it's the "aironauts
 * hire, G4 launch readiness" kind of decision the entry-screen mock
 * itself calls out as needing a decision. */
export async function advanceProductStageGate(productId: string) {
  const person = await requireHangarLead();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("stage_gate, name, track")
    .eq("id", productId)
    .eq("workspace_id", person.workspace_id)
    .maybeSingle();
  if (!product) throw new Error("Product not found in this workspace.");
  if (product.track !== "market") throw new Error("Only a Market-track product moves through stage gates.");

  const next = nextProductStageGate(product.stage_gate);
  if (!next) throw new Error("Already at G5 — nothing further to advance to.");

  const { error: updateError } = await supabase
    .from("products")
    .update({ stage_gate: next })
    .eq("id", productId)
    .eq("workspace_id", person.workspace_id);
  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase.from("product_gate_history").insert({
    workspace_id: person.workspace_id,
    product_id: productId,
    stage_gate: next,
    reached_by_person_id: person.id,
  });
  if (historyError) throw new Error(historyError.message);

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "product_gate_advanced",
      title: `${product.name} reached ${next}`,
      body: `${person.full_name} advanced ${product.name} to ${next}.`,
      relatedUrl: `/hangar/products/${productId}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`/hangar/products/${productId}`);
  revalidatePath("/hangar/products");
  revalidatePath("/manifest");
  revalidatePath("/");
}
