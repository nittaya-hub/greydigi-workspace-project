import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId, getSelectedClientHypercareEnabled } from "@/lib/data/client-scope";
import { getHypercareOverview } from "@/lib/data/hypercare";
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

  const hypercareEnabled = await getSelectedClientHypercareEnabled();
  if (hypercareEnabled === false) return NextResponse.json({ error: "Hypercare isn't enabled for this client." }, { status: 404 });

  const clientId = await getSelectedClientId();
  const overview = await getHypercareOverview(workspaceId, clientId);
  const logoSrc = await resolvePdfLogo(workspaceId);
  const accentColor = await resolvePdfAccentColor(workspaceId);
  const scopeName = await resolveScopeName(workspaceId, clientId);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    SimpleListPdf({
      docTitle: "Service health",
      eyebrow: "HYPERCARE EXPORT",
      scopeLabel: scopeName,
      generatedOn,
      logoSrc,
      accentColor,
      rows: overview.serviceHealth,
      keyOf: (s) => s.ref,
      emptyNote: "No services live yet.",
      columns: [
        { header: "REF", width: "14%", render: (s) => s.ref },
        { header: "SERVICE", width: "32%", render: (s) => s.name },
        { header: "HEALTH", width: "18%", muted: true, render: (s) => s.health.replace("_", " ").toUpperCase() },
        { header: "NOTE", width: "36%", muted: true, render: (s) => s.note },
      ],
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyForFilename(scopeName)}-service-health-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
