import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getPersonProfile, type PersonWorkItem } from "@/lib/data/person";
import { resolvePdfLogo } from "@/lib/pdf/resolveLogo";
import { resolvePdfAccentColor } from "@/lib/pdf/resolveAccent";
import { SimpleListPdf } from "@/lib/pdf/SimpleListPdf";

export const runtime = "nodejs";

// Same rule as the page's own canExport() (src/app/(app)/people/[id]/page.tsx)
// -- own data always exportable, a workspace_admin can export anyone's.
// Duplicated rather than imported because it's a 2-line same-file helper
// there, not exported; kept identical on purpose.
function canExport(viewerId: string | undefined, viewerRole: string | undefined, personId: string) {
  if (!viewerId) return false;
  return viewerId === personId || viewerRole === "workspace_admin";
}

type ExportRow = { stage: string; space: PersonWorkItem["space"]; ref: string; title: string; status: string; context: string; due: string };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentPerson();
  if (!viewer) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const person = await getPersonProfile(id);
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (!canExport(viewer.id, viewer.workspace_role, person.id)) {
    return NextResponse.json({ error: "Not authorized to export this person's data." }, { status: 403 });
  }

  const rows: ExportRow[] = [
    ...person.current.map((i) => ({ stage: "current", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
    ...person.next.map((i) => ({ stage: "next", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
    ...person.completed.map((i) => ({ stage: "completed", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
  ];

  const logoSrc = await resolvePdfLogo(viewer.workspace_id);
  const accentColor = await resolvePdfAccentColor(viewer.workspace_id);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    SimpleListPdf({
      docTitle: `${person.fullName} — work summary`,
      eyebrow: "PEOPLE EXPORT",
      scopeLabel: person.fullName,
      generatedOn,
      logoSrc,
      accentColor,
      rows,
      keyOf: (r, i) => `${r.stage}-${r.ref}-${i}`,
      emptyNote: "No work items yet.",
      columns: [
        { header: "STAGE", width: "14%", muted: true, render: (r) => r.stage.toUpperCase() },
        { header: "SPACE", width: "12%", muted: true, render: (r) => r.space.toUpperCase() },
        { header: "REF", width: "12%", render: (r) => r.ref },
        { header: "TITLE", width: "28%", render: (r) => r.title },
        { header: "STATUS", width: "16%", muted: true, render: (r) => r.status.replace("_", " ").toUpperCase() },
        { header: "DUE", width: "18%", muted: true, render: (r) => r.due || "—" },
      ],
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${person.fullName.replace(/\s+/g, "-").toLowerCase()}-work-summary.pdf"`,
    },
  });
}
