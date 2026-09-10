import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import {
  getProjectByRef,
  getProjectProgressStats,
  getProjectDecisions,
  getProjectWeeklyCommitments,
  getProjectBaselineMeasures,
} from "@/lib/data/project";
import { resolvePdfLogo } from "@/lib/pdf/resolveLogo";
import { resolvePdfAccentColor } from "@/lib/pdf/resolveAccent";
import { CheckpointPdf } from "@/lib/pdf/CheckpointPdf";

export const runtime = "nodejs";

// Internal-only export: this route sits behind the Checkpoint data tab
// (an internal admin page), so it renders every row the team has typed
// in, reviewed or not -- a "NEEDS REVIEW" tag on each unreviewed row
// (see CheckpointPdf.tsx) instead of hiding it, since the whole point of
// this document is rehearsing the checkpoint meeting before the
// reviewed-only data goes out to the client via the portal or Publish.
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const [stats, decisions, commitments, measures] = await Promise.all([
    getProjectProgressStats(project.id),
    getProjectDecisions(project.id),
    getProjectWeeklyCommitments(project.id),
    getProjectBaselineMeasures(project.id),
  ]);

  const logoSrc = await resolvePdfLogo(project.workspaceId);
  const accentColor = await resolvePdfAccentColor(project.workspaceId, project.id);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    CheckpointPdf({ project, logoSrc, accentColor, generatedOn, stats, decisions, commitments, measures })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${project.ref}-checkpoint.pdf"`,
    },
  });
}
