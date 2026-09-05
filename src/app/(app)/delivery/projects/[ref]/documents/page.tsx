import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getProjectByRef, getProjectDocuments } from "@/lib/data/project";
import { UploadDocumentButton } from "./UploadDocumentButton";

const COLS = "1fr 62px 104px 104px";

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

      <Card>
        {documents.length === 0 ? (
          <EmptyState title="No documents yet." description="Uploaded artefacts and generated documents will appear here." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>ARTEFACT</span>
              <span>VER</span>
              <span>VISIBILITY</span>
              <span>STATUS</span>
            </TableHead>
            {documents.map((d, i) => (
              <TableRow cols={COLS} key={d.id} last={i === documents.length - 1}>
                <CellStack primary={d.name} secondary={d.kind.toUpperCase()} />
                <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                <Pill tone={d.visibility === "client_visible" ? "waiting_on_client" : "idle"} className="justify-self-start">
                  {d.visibility === "client_visible" ? "CLIENT" : "INTERNAL"}
                </Pill>
                <Pill
                  tone={!d.requiresSignature ? "in_progress" : d.signedAt ? "done" : "blocked"}
                  className="justify-self-start"
                >
                  {!d.requiresSignature ? "CURRENT" : d.signedAt ? "SIGNED" : "UNSIGNED"}
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">VISIBILITY RULE</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Internal is the default. Marking a document client visible adds it to the published projection at the
          next publish, not immediately. Unpublishing removes it from the portal and keeps the file.
        </span>
      </Card>
    </div>
  );
}
