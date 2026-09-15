import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getProjectByRef, getProjectDocuments } from "@/lib/data/project";
import { UploadDocumentButton } from "./UploadDocumentButton";
import { DocumentsTable } from "./DocumentsTable";

export default async function ProjectDocumentsPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const documents = await getProjectDocuments(project.id);
  const clientVisible = documents.filter((d) => d.visibility === "client_visible").length;
  const awaitingSignature = documents.filter((d) => d.requiresSignature && !d.signedAt).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          One file store. Visibility decides what the portal projection can read.
        </p>
        <UploadDocumentButton projectId={project.id} projectRef={project.ref} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">
          ALL {documents.length}
        </span>
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
          CLIENT VISIBLE {clientVisible}
        </span>
        {awaitingSignature > 0 ? (
          <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
            AWAITING SIGNATURE {awaitingSignature}
          </span>
        ) : null}
      </div>

      <DocumentsTable documents={documents} />

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">VISIBILITY RULE</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Internal is the default. Marking a document client visible adds it to the published projection at the
          next publish, not immediately. Unpublishing removes it from the portal and keeps the file.
        </span>
      </Card>
      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">GATE COLUMN</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Six kinds map to a signed artefact on the flight plan spine — Scope brief, Quote and Agreement clear G2,
          Manifest v1 &amp; foundation schema clears G3, Go-live pack clears G4, Tie-out certificate clears G5.
          Anything filed as internal is a working file, not one of the six, and carries no gate.
        </span>
      </Card>
    </div>
  );
}
