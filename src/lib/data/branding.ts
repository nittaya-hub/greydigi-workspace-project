import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export interface WorkspaceBranding {
  tokens: Json;
  logoDataUrl: string | null;
  logoFilename: string | null;
  htmlTemplate: string | null;
  sourceFilename: string | null;
  updatedAt: string | null;
}

const EMPTY_BRANDING: WorkspaceBranding = {
  tokens: {},
  logoDataUrl: null,
  logoFilename: null,
  htmlTemplate: null,
  sourceFilename: null,
  updatedAt: null,
};

export async function getWorkspaceBranding(workspaceId: string): Promise<WorkspaceBranding> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_branding")
    .select("tokens, logo_data_url, logo_filename, html_template, source_filename, updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return EMPTY_BRANDING;
  return {
    tokens: data.tokens,
    logoDataUrl: data.logo_data_url,
    logoFilename: data.logo_filename,
    htmlTemplate: data.html_template,
    sourceFilename: data.source_filename,
    updatedAt: data.updated_at,
  };
}

/** Reads one color token out of a parsed design-tokens JSON (the W3C
 * Design Tokens Format community-group shape — see
 * greydigi-design/assets/tokens.json — { color: { brand: { coral: {
 * "$value": "#..." } } } }). `path` is dot-separated, e.g.
 * "color.brand.coral". Returns null if the path is missing or its
 * value isn't a color token, so callers can fall back to a default
 * rather than render "undefined". */
export function readColorToken(tokens: Json, path: string): string | null {
  let node: Json = tokens;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return null;
    node = (node as Record<string, Json | undefined>)[key] ?? null;
    if (node === null) return null;
  }
  if (typeof node !== "object" || node === null || Array.isArray(node)) return null;
  const value = (node as Record<string, Json | undefined>)["$value"];
  return typeof value === "string" ? value : null;
}
