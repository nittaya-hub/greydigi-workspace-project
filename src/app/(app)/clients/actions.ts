"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function addClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  const clientSince = String(formData.get("clientSince") ?? "").trim() || null;

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      workspace_id: person.workspace_id,
      name,
      client_since: clientSince,
    })
    .select("id")
    .single();
  if (error || !client) throw new Error(error?.message ?? "Could not add the client.");

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "client_added",
      title: `New client: ${name}`,
      body: `${person.full_name} added ${name} as a client.`,
      relatedUrl: `/clients/${client.id}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/clients");
  revalidatePath("/");
}
