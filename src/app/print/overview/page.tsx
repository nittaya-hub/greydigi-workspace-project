import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { getWorkspaceBranding, readColorToken } from "@/lib/data/branding";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceOverviewMain } from "@/components/dashboard/WorkspaceOverviewMain";

/** The Puppeteer-printed twin of src/app/(app)/page.tsx -- same reasoning
 * as print/projects/[ref]/page.tsx: lives outside (app) so it skips the
 * sidebar shell entirely, so its own branded header/footer stand in for
 * it. There's no per-project accent override at this scope (this is the
 * workspace-wide dashboard, not one project) -- only the workspace's own
 * uploaded theme token, same fallback WorkspaceOverviewPdf.tsx already
 * used before this page existed. */
export default async function PrintOverviewPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();

  let selectedClientName: string | null = null;
  if (selectedClientId) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", selectedClientId).maybeSingle();
    selectedClientName = client?.name ?? null;
  }
  const { data: workspaceRow } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = workspaceRow?.name ?? "Workspace";

  const branding = await getWorkspaceBranding(workspaceId);
  const hostLogoSrc = branding.logoDataUrl ?? "/greydigi-logo.png";
  const accentColor = readColorToken(branding.tokens, "color.brand.coral");
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });
  const pageTitle = selectedClientName ? `${selectedClientName} Overview` : `${workspaceName} Dashboard`;

  return (
    <div
      style={accentColor ? ({ "--color-coral": accentColor } as React.CSSProperties) : undefined}
      // max-w matches renderPrintPage.ts's LANDSCAPE_WIDTH (1850)
      className="bg-paper px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1850px] mx-auto"
    >
      <header className="flex items-center gap-3 pb-3.5 border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- printed page, not a Next-optimized route */}
        <img src={hostLogoSrc} alt="greydigi" className="h-[22px] w-auto max-w-[84px] object-contain rounded-[4px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        <span className="flex-1" />
        <span className="font-mono text-[9.5px] text-muted-2">GENERATED {generatedOn.toUpperCase()}</span>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display font-extrabold text-[23px] tracking-[-0.02em] text-ink">{pageTitle}</h1>
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          {selectedClientName
            ? "Three spaces read the same client, person and project records. Every number names its source and its formula."
            : "Overview of everything, split by category — every project, every client."}
        </p>
      </div>

      <WorkspaceOverviewMain workspaceId={workspaceId} selectedClientId={selectedClientId} />

      <footer className="pt-3.5 border-t border-line-soft text-center font-mono text-[9px] text-muted-2">
        greydigi pte ltd · Confidential · {pageTitle} · {generatedOn}
      </footer>
    </div>
  );
}
