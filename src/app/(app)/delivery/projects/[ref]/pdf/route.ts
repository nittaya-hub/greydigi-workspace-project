import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getProjectByRef } from "@/lib/data/project";
import { renderPrintPagePdf, landscapeFromRequest } from "@/lib/pdf/renderPrintPage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  return renderPrintPagePdf(
    request,
    `/print/projects/${project.ref.toLowerCase()}`,
    `${project.ref}-overview-${new Date().toISOString().slice(0, 10)}.pdf`,
    { landscape: landscapeFromRequest(request) }
  );
}
