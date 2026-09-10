import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { renderPrintPagePdf, landscapeFromRequest } from "@/lib/pdf/renderPrintPage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  return renderPrintPagePdf(request, "/print/overview", `workspace-overview-${new Date().toISOString().slice(0, 10)}.pdf`, {
    landscape: landscapeFromRequest(request),
  });
}
