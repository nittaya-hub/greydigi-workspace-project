import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listProjects } from "@/lib/data/delivery";
import { resolvePdfLogo } from "@/lib/pdf/resolveLogo";
import { resolvePdfAccentColor } from "@/lib/pdf/resolveAccent";
import { resolveScopeName, slugifyForFilename } from "@/lib/pdf/resolveScope";
import { SimpleListPdf } from "@/lib/pdf/SimpleListPdf";

export const runtime = "nodejs";

export async function GET() {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No workspace." }, { status: 404 });

  const clientId = await getSelectedClientId();
  const projects = await listProjects(workspaceId, clientId);
  const logoSrc = await resolvePdfLogo(workspaceId);
  const accentColor = await resolvePdfAccentColor(workspaceId);
  const scopeName = await resolveScopeName(workspaceId, clientId);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    SimpleListPdf({
      docTitle: "Delivery projects",
      eyebrow: "PORTFOLIO EXPORT",
      scopeLabel: scopeName,
      generatedOn,
      logoSrc,
      accentColor,
      rows: projects,
      keyOf: (p) => p.id,
      emptyNote: "No active projects in this space yet.",
      columns: [
        { header: "REF", width: "10%", render: (p) => p.ref },
        { header: "NAME", width: "30%", render: (p) => p.name },
        { header: "CLIENT", width: "18%", muted: true, render: (p) => p.clientName },
        { header: "PHASE", width: "18%", muted: true, render: (p) => (p.phaseCode ? `${p.phaseCode} ${p.phaseName ?? ""}`.trim() : "—") },
        {
          header: "NEXT GATE",
          width: "14%",
          muted: true,
          render: (p) => (p.nextGate ? `${p.nextGate.code}${p.nextGate.targetDate ? ` (${p.nextGate.targetDate})` : ""}` : "—"),
        },
        { header: "HEALTH", width: "10%", muted: true, render: (p) => p.health.replace("_", " ").toUpperCase() },
      ],
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyForFilename(scopeName)}-projects-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
