import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui/Card";
import { getProjectByRef, getProjectBranding } from "@/lib/data/project";
import { getWorkspaceBranding } from "@/lib/data/branding";
import { ProjectOverviewMain } from "@/components/delivery/ProjectOverviewMain";

/** The Puppeteer-printed twin of delivery/projects/[ref]/page.tsx --
 * lives outside the (app) route group entirely, so it never picks up
 * the sidebar/header shell or the project tabs from that group's
 * layout.tsx. That also means it never picks up the sidebar's own
 * greydigi mark, so the branded header/footer below are added here on
 * purpose -- the same workspace theme (Settings -> Branding) every other
 * export already reads, just rendered as real HTML instead of a
 * react-pdf Image/Text pair. Auth is still enforced -- proxy.ts's
 * matcher covers every path except /auth/, this one included -- so a
 * request here still needs the caller's session cookies, which the
 * pdf/route.ts handler forwards from the original export request. */
export default async function PrintProjectOverviewPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: projectRef } = await params;
  const project = await getProjectByRef(projectRef);
  if (!project) notFound();

  const [branding, workspaceBranding] = await Promise.all([
    getProjectBranding(project.id),
    getWorkspaceBranding(project.workspaceId),
  ]);
  const hostLogoSrc = workspaceBranding.logoDataUrl ?? "/greydigi-logo.png";
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div
      style={branding.accentColor ? ({ "--color-coral": branding.accentColor } as React.CSSProperties) : undefined}
      // max-w matches renderPrintPage.ts's LANDSCAPE_WIDTH (1850)
      className="bg-paper px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1850px] mx-auto"
    >
      <header className="flex items-center gap-3 pb-3.5 border-b border-line flex-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element -- printed page, not a Next-optimized route */}
        <img src={hostLogoSrc} alt="greydigi" className="h-[22px] w-auto max-w-[84px] object-contain rounded-[4px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        {branding.logoDataUrl || branding.showClientName ? <span className="w-px h-[18px] bg-line" /> : null}
        {branding.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoDataUrl} alt="" className="h-[22px] w-auto max-w-[84px] object-contain rounded-[4px]" />
        ) : null}
        {branding.showClientName ? (
          <span className="text-[12.5px] text-muted min-w-0 truncate">{branding.clientDisplayName || project.clientName}</span>
        ) : null}
        <span className="flex-1" />
        <span className="font-mono text-[9.5px] text-muted-2">GENERATED {generatedOn.toUpperCase()}</span>
      </header>

      <div className="flex flex-col gap-[5px] min-w-0">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <Eyebrow>
          {project.ref} · {project.clientName} · MISSION
        </Eyebrow>
        <h1 className="m-0 font-display font-extrabold text-[23px] tracking-[-0.02em] text-ink">{project.name}</h1>
        {project.description ? <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">{project.description}</p> : null}
      </div>

      <ProjectOverviewMain projectRef={projectRef} />

      <footer className="pt-3.5 border-t border-line-soft text-center font-mono text-[9px] text-muted-2">
        greydigi pte ltd · Confidential · {project.clientName}, {project.name} overview · {generatedOn}
      </footer>
    </div>
  );
}
