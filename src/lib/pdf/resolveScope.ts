import { createClient } from "@/lib/supabase/server";

/** The real name a PDF export should be labeled with — the selected
 * client's name when the sidebar is scoped to one client, otherwise the
 * workspace's own name. Used for both the footer ("greydigi pte ltd ·
 * Confidential · <scope name>, <document> · <date>") and the downloaded
 * filename, so a file never reads as a generic "workspace-overview.pdf"
 * when it's actually Nutrition Kitchen's own export. */
export async function resolveScopeName(workspaceId: string, clientId?: string | null): Promise<string> {
  const supabase = await createClient();
  if (clientId) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
    if (client?.name) return client.name;
  }
  const { data: workspaceRow } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  return workspaceRow?.name ?? "greydigi";
}

/** A filename-safe slug of a real name (client or workspace), e.g.
 * "Nutrition KITCHEN" -> "nutrition-kitchen". */
export function slugifyForFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "export";
}
