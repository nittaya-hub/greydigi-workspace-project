import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listClientSubmissions } from "@/lib/data/client-submissions";
import { SubmissionStatusSelect } from "./SubmissionStatusSelect";

const COLS = "90px 1fr 130px 110px 130px";

const KIND_LABEL: Record<string, string> = {
  issue: "REPORT AN ISSUE",
  change_request: "CHANGE REQUEST",
  question: "QUESTION",
};

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function ClientSubmissionsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const submissions = workspaceId ? await listClientSubmissions(workspaceId, clientId) : [];
  const open = submissions.filter((s) => s.status !== "resolved");

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Client submissions"
        description="What clients typed into the portal, before anyone on the team saw it — Report an issue, Change request, Ask a question. Distinct from internally-logged incidents and requests."
      />

      <Card>
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet."
            description="Clients can report an issue, raise a change request, or ask a question from their portal at any time."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>KIND</span>
              <span>SUBMISSION</span>
              <span>CLIENT</span>
              <span>AGE</span>
              <span>STATUS</span>
            </TableHead>
            {submissions.map((s, i) => {
              const days = ageDays(s.createdAt);
              return (
                <TableRow cols={COLS} key={s.id} last={i === submissions.length - 1}>
                  <Pill tone={s.kind === "issue" ? "blocked" : s.kind === "change_request" ? "watch" : "idle"} className="justify-self-start">
                    {KIND_LABEL[s.kind] ?? s.kind.toUpperCase()}
                  </Pill>
                  <CellStack
                    primary={s.title}
                    secondary={[s.serviceName, s.severity, s.priority, s.attachmentCount > 0 ? `${s.attachmentCount} FILE${s.attachmentCount === 1 ? "" : "S"}` : null]
                      .filter(Boolean)
                      .join(" · ")
                      .toUpperCase()}
                  />
                  <span className="text-[11.5px] text-muted truncate">{s.clientName}</span>
                  <span className={`font-mono text-[9.5px] ${days > 3 && s.status !== "resolved" ? "text-warn-fg" : "text-muted"}`}>{days}d</span>
                  <SubmissionStatusSelect submissionId={s.id} status={s.status} />
                </TableRow>
              );
            })}
          </>
        )}
      </Card>

      {open.length === 0 && submissions.length > 0 ? (
        <p className="text-[11.5px] text-muted">All caught up — every submission is resolved.</p>
      ) : null}
    </div>
  );
}
