import { readFile } from "node:fs/promises";
import path from "node:path";
import { getWorkspaceBranding } from "@/lib/data/branding";

let cachedDefaultLogo: string | null = null;
async function defaultLogoDataUrl(): Promise<string> {
  if (cachedDefaultLogo) return cachedDefaultLogo;
  const bytes = await readFile(path.join(process.cwd(), "public", "greydigi-logo.png"));
  cachedDefaultLogo = `data:image/png;base64,${bytes.toString("base64")}`;
  return cachedDefaultLogo;
}

/** The greydigi/host mark every PDF export's header shows — the
 * workspace's uploaded theme (Settings -> Branding) if one exists,
 * otherwise the app's own default mark.
 *
 * This used to also accept a project-level branding override and show
 * that INSTEAD of the host logo, on the mistaken belief that it matched
 * ClientPortalView.tsx's fallback order. It doesn't: the live portal
 * renders the host logo and a project's own client logo side by side as
 * two separate marks (see ClientPortalView.tsx's header) -- one never
 * replaces the other. Passing project branding in here made greydigi's
 * own logo silently disappear from the checkpoint PDF the moment a
 * project had ANY client logo set, replaced by that client's mark next
 * to the word "greydigi" with no icon of its own. This function now only
 * ever resolves the host mark; a caller that wants the client's logo
 * too should render it as its own, separate image. */
export async function resolvePdfLogo(workspaceId: string): Promise<string> {
  const workspaceBranding = await getWorkspaceBranding(workspaceId);
  return workspaceBranding.logoDataUrl ?? (await defaultLogoDataUrl());
}
