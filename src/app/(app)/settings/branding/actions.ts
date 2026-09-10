"use server";

import { revalidatePath } from "next/cache";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAdmin } from "@/lib/data/auth-guard";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

/** Admin-only: uploads a design-tokens package — a .skill file (which is
 * just a zip; see greydigi-design.skill) or a plain .zip with the same
 * shape — and extracts the pieces server-side PDF/Excel export code
 * actually needs: a W3C Design Tokens Format tokens.json (colors/fonts),
 * a logo image, and an HTML template if one is bundled. Nothing here
 * invokes "a Claude skill" — a deployed app has no way to do that; the
 * package is read purely as a zip of static files, same as any other
 * upload. Re-running this with an updated package overwrites the
 * previous one (one branding config per workspace). */
export async function uploadWorkspaceBranding(formData: FormData): Promise<{ tokenCount: number; logoFilename: string | null }> {
  const admin = await requireWorkspaceAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a .skill or .zip file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (10MB max).");

  let zip: JSZip;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Could not read that file — is it a valid .skill/.zip package?");
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir);

  const tokensEntry = entries.find((f) => f.name.toLowerCase().endsWith("assets/tokens.json")) ?? entries.find((f) => f.name.toLowerCase().endsWith("tokens.json"));
  let tokens: unknown = {};
  if (tokensEntry) {
    try {
      tokens = JSON.parse(await tokensEntry.async("string"));
    } catch {
      throw new Error(`Found ${tokensEntry.name} but couldn't parse it as JSON.`);
    }
  }

  const imageEntries = entries.filter((f) => ["png", "svg", "jpg", "jpeg", "webp"].includes(extensionOf(f.name)));
  const logoEntry = imageEntries.find((f) => f.name.toLowerCase().includes("logo")) ?? imageEntries[0];
  let logoDataUrl: string | null = null;
  let logoFilename: string | null = null;
  if (logoEntry) {
    const ext = extensionOf(logoEntry.name);
    const mime = IMAGE_MIME[ext] ?? "application/octet-stream";
    if (ext === "svg") {
      const text = await logoEntry.async("string");
      logoDataUrl = `data:${mime};utf8,${encodeURIComponent(text)}`;
    } else {
      const base64 = await logoEntry.async("base64");
      logoDataUrl = `data:${mime};base64,${base64}`;
    }
    logoFilename = logoEntry.name.split("/").pop() ?? logoEntry.name;
  }

  const htmlEntry = entries.find((f) => f.name.toLowerCase().includes("/templates/") && f.name.toLowerCase().endsWith(".html")) ?? entries.find((f) => f.name.toLowerCase().endsWith(".html"));
  const htmlTemplate = htmlEntry ? await htmlEntry.async("string") : null;

  if (!tokensEntry && !logoEntry && !htmlTemplate) {
    throw new Error("No usable tokens.json, logo image, or HTML template found in that package.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_branding").upsert(
    {
      workspace_id: admin.workspace_id,
      tokens: tokens as never,
      logo_data_url: logoDataUrl,
      logo_filename: logoFilename,
      html_template: htmlTemplate,
      source_filename: file.name,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    },
    { onConflict: "workspace_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/settings/branding");
  return { tokenCount: tokensEntry ? Object.keys(tokens as object).length : 0, logoFilename };
}
