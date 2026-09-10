import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCrossSpaceDashboard } from "@/lib/data/dashboard";
import { getWorkspaceBranding, readColorToken } from "@/lib/data/branding";
import { CrossSpaceDashboardMain } from "@/components/dashboard/CrossSpaceDashboardMain";

/** Puppeteer-printed twin of src/app/(app)/dashboard/page.tsx -- same
 * pattern as print/overview/page.tsx. */
export default async function PrintDashboardPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const [data, branding] = await Promise.all([getCrossSpaceDashboard(workspaceId), getWorkspaceBranding(workspaceId)]);
  const hostLogoSrc = branding.logoDataUrl ?? "/greydigi-logo.png";
  const accentColor = readColorToken(branding.tokens, "color.brand.coral");
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div
      style={accentColor ? ({ "--color-coral": accentColor } as React.CSSProperties) : undefined}
      // max-w matches renderPrintPage.ts's LANDSCAPE_WIDTH (1850) so a
      // landscape export's wider viewport actually gets to use the extra
      // room instead of being capped back down to the portrait width.
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
        <h1 className="m-0 font-display font-extrabold text-[23px] tracking-[-0.02em] text-ink">Where work crosses spaces</h1>
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Every arrow is an explicit, audited relationship between records. None of these numbers are inferred.
        </p>
      </div>

      <CrossSpaceDashboardMain data={data} />

      <footer className="pt-3.5 border-t border-line-soft text-center font-mono text-[9px] text-muted-2">
        greydigi pte ltd · Confidential · Cross-space export · {generatedOn}
      </footer>
    </div>
  );
}
