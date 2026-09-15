"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHangarLead } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** Sets a release's status to 'ready'. The button that calls this is already
 * disabled while any exit criteria are open (see page.tsx). Restricted to
 * the Hangar lead or a workspace admin — marking a release ready is what
 * tells everyone downstream it's safe to build on. */
export async function markReleaseReady(releaseId: string, releaseCode: string) {
  const supabase = await createClient();
  const person = await requireHangarLead();

  const { data: release } = await supabase.from("releases").select("id, name, product_id").eq("id", releaseId).maybeSingle();
  if (!release) throw new Error("Release not found.");
  const { data: product } = await supabase.from("products").select("workspace_id").eq("id", release.product_id).maybeSingle();
  if (!product) throw new Error("Product not found.");

  const { error } = await supabase.from("releases").update({ status: "ready" }).eq("id", releaseId);
  if (error) throw new Error(error.message);

  const urlCode = releaseCode.toLowerCase().replace(/\./g, "-");

  await notifyWorkspace(
    product.workspace_id,
    {
      kind: "release_marked_ready",
      title: `${releaseCode.toUpperCase()} marked ready`,
      body: `${person?.full_name ?? "Someone"} marked ${release.name} (${releaseCode.toUpperCase()}) ready to ship.`,
      relatedUrl: `/hangar/releases/${urlCode}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/hangar/releases/${urlCode}`);
  revalidatePath("/hangar/releases");
  revalidatePath("/hangar");
  revalidatePath("/");
}
