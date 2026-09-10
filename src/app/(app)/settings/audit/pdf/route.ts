import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listAuditLog } from "@/lib/data/admin";
import { resolvePdfLogo } from "@/lib/pdf/resolveLogo";
import { resolvePdfAccentColor } from "@/lib/pdf/resolveAccent";
import { resolveScopeName, slugifyForFilename } from "@/lib/pdf/resolveScope";
import { SimpleListPdf } from "@/lib/pdf/SimpleListPdf";

export const runtime = "nodejs";

export async function GET() {
  const person = await getCurrentPerson();
  if (person?.workspace_role !== "workspace_admin") {
    return NextResponse.json({ error: "Workspace admins only." }, { status: 403 });
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No workspace." }, { status: 404 });

  const rows = await listAuditLog(workspaceId);
  const logoSrc = await resolvePdfLogo(workspaceId);
  const accentColor = await resolvePdfAccentColor(workspaceId);
  const scopeName = await resolveScopeName(workspaceId);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    SimpleListPdf({
      docTitle: "Audit log",
      eyebrow: "SETTINGS EXPORT",
      scopeLabel: scopeName,
      generatedOn,
      logoSrc,
      accentColor,
      rows,
      keyOf: (r) => r.id,
      emptyNote: "No activity recorded yet.",
      columns: [
        { header: "TIME", width: "20%", muted: true, render: (r) => r.createdAt.slice(0, 19).replace("T", " ") },
        { header: "SUMMARY", width: "42%", render: (r) => r.summary },
        { header: "ACTOR", width: "20%", muted: true, render: (r) => r.actorName },
        { header: "RECORD TYPE", width: "18%", muted: true, render: (r) => r.entityType },
      ],
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyForFilename(scopeName)}-audit-log-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
