"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  const description = String(formData.get("description") ?? "").trim() || null;

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    workspace_id: person.workspace_id,
    name,
    description,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "product_created",
      title: `Product created: ${name}`,
      body: `${person.full_name} added a new product.`,
      relatedUrl: "/product/products",
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/product/products");
  revalidatePath("/product");
  revalidatePath("/");
}
