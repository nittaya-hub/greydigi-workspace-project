import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getProductOverview } from "@/lib/data/product";
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

  // Product is workspace-wide by design (see src/lib/data/workspace.ts's
  // own comment: a client filter here would be fabricated, not real
  // scoping) -- so its scope name is always the workspace, never a client.
  const overview = await getProductOverview(workspaceId);
  const logoSrc = await resolvePdfLogo(workspaceId);
  const accentColor = await resolvePdfAccentColor(workspaceId);
  const scopeName = await resolveScopeName(workspaceId);
  const generatedOn = new Date().toLocaleDateString("en-SG", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    SimpleListPdf({
      docTitle: "Product features",
      eyebrow: "PRODUCT EXPORT",
      scopeLabel: scopeName,
      generatedOn,
      logoSrc,
      accentColor,
      rows: overview.features,
      keyOf: (f) => f.ref,
      emptyNote: "No roadmap items yet.",
      columns: [
        { header: "REF", width: "12%", render: (f) => f.ref },
        { header: "TITLE", width: "34%", render: (f) => f.title },
        { header: "PRODUCT", width: "20%", muted: true, render: (f) => f.productName },
        { header: "RELEASE", width: "14%", muted: true, render: (f) => f.releaseCode ?? "—" },
        { header: "STATUS", width: "20%", muted: true, render: (f) => f.status.replace("_", " ").toUpperCase() },
      ],
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyForFilename(scopeName)}-product-features-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
