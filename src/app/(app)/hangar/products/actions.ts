"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

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
