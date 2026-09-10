import { getWorkspaceBranding, readColorToken } from "@/lib/data/branding";
import { getProjectBranding } from "@/lib/data/project";
import { PDF_COLORS } from "@/lib/pdf/shared";

/** The one accent color every PDF export's stat tiles, rule bars and
 * review tags should use, so a branded workspace shows up as branded in
 * its exports too, not just on screen. Same fallback order as the live
 * portal and the Puppeteer print pages (ClientPortalView.tsx,
 * print/projects/[ref]/page.tsx) — a project's own accent override
 * (Client View Config -> Branding) first when this export is for one
 * project, then the workspace's uploaded theme (Settings -> Branding)'s
 * color.brand.coral token, then the app's own default coral. Those two
 * other call sites apply the override as a CSS variable; @react-pdf/
 * renderer can't read CSS, so this resolves the same value as a plain
 * string for callers to pass down as a prop instead. */
export async function resolvePdfAccentColor(workspaceId: string, projectId?: string): Promise<string> {
  if (projectId) {
    const projectBranding = await getProjectBranding(projectId);
    if (projectBranding.accentColor) return projectBranding.accentColor;
  }
  const workspaceBranding = await getWorkspaceBranding(workspaceId);
  const tokenColor = readColorToken(workspaceBranding.tokens, "color.brand.coral");
  return tokenColor ?? PDF_COLORS.coral;
}
