"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import type { ClientSubmissionRow, SubmissionCommentRow } from "@/lib/data/client-submissions";
import type { WorkspacePersonOption } from "@/lib/data/project";
import { DownloadAttachmentLink } from "./DownloadAttachmentLink";
import { SubmissionAssigneeSelect } from "./SubmissionAssigneeSelect";
import { SubmissionNeedsNoticeToggle } from "./SubmissionNeedsNoticeToggle";
import { addSubmissionComment, fetchSubmissionComments } from "./actions";

const KIND_LABEL: Record<string, string> = {
  issue: "Report an issue",
  change_request: "Change request",
  question: "Question",
};

function relativeTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Wraps a submission's title so clicking it opens the full detail —
 * the row itself only ever had room for a truncated title and a "1
 * FILE" count. Also carries the case-tracking controls (assignee,
 * "notify client" flag) and the internal reply thread, loaded on
 * demand the first time this modal opens rather than upfront for
 * every row on the page. */
export function SubmissionDetailButton({
  submission,
  people,
  children,
}: {
  submission: ClientSubmissionRow;
  people: WorkspacePersonOption[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<SubmissionCommentRow[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [isPosting, startPosting] = useTransition();

  useEffect(() => {
    if (!open || comments !== null) return;
    fetchSubmissionComments(submission.id)
      .then(setComments)
      .catch(() => setComments([]));
  }, [open, comments, submission.id]);

  function submitComment() {
    const trimmed = commentBody.trim();
    if (!trimmed) return;
    startPosting(async () => {
      try {
        await addSubmissionComment(submission.id, trimmed);
        setCommentBody("");
        setComments(await fetchSubmissionComments(submission.id));
      } catch {
        // Left in the textarea so the person can retry without retyping.
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left min-w-0 w-full">
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={KIND_LABEL[submission.kind] ?? submission.kind}>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[14px] font-semibold text-ink">{submission.title}</span>
            <span className="font-mono text-[9.5px] text-muted flex-none">{submission.clientName}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {submission.category ? <Pill tone="idle">{submission.category.toUpperCase()}</Pill> : null}
            {submission.severity ? <Pill tone="blocked">{submission.severity.toUpperCase()}</Pill> : null}
            {submission.priority ? <Pill tone="watch">{submission.priority.toUpperCase()}</Pill> : null}
          </div>

          <div className="flex items-center gap-3 flex-wrap border-y border-line py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] tracking-[.08em] text-muted">ASSIGNED TO</span>
              <SubmissionAssigneeSelect submissionId={submission.id} assigneePersonId={submission.assigneePersonId} people={people} />
            </div>
            <SubmissionNeedsNoticeToggle submissionId={submission.id} needsClientNotice={submission.needsClientNotice} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">DESCRIPTION</span>
            <p className="m-0 text-[12.5px] text-ink leading-[1.55] whitespace-pre-wrap">{submission.description}</p>
          </div>

          {submission.businessImpact ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[.08em] text-muted">BUSINESS IMPACT</span>
              <p className="m-0 text-[12.5px] text-ink leading-[1.55] whitespace-pre-wrap">{submission.businessImpact}</p>
            </div>
          ) : null}

          {submission.attachments.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[9px] tracking-[.08em] text-muted">
                ATTACHMENT{submission.attachments.length === 1 ? "" : "S"} — {submission.attachments.length}
              </span>
              <div className="flex flex-col gap-1.5">
                {submission.attachments.map((a) => (
                  <DownloadAttachmentLink key={a.id} filePath={a.filePath} fileName={a.fileName} fileSize={a.fileSize} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">
              INTERNAL NOTES{comments && comments.length > 0 ? ` — ${comments.length}` : ""}
            </span>
            {comments === null ? (
              <p className="m-0 text-[11.5px] text-muted">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="m-0 text-[11.5px] text-muted">No notes yet — visible to your team only, never to the client.</p>
            ) : (
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                {comments.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-semibold text-ink">
                      {c.authorName} <span className="font-normal text-muted">{relativeTime(c.createdAt)}</span>
                    </span>
                    <span className="text-[12px] text-ink leading-[1.5] whitespace-pre-wrap">{c.body}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-1.5 mt-1">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add an internal note for the team…"
                rows={2}
                className="w-full rounded-[8px] border border-line bg-white px-2.5 py-2 text-[12px] text-ink placeholder:text-muted-2 focus:outline-none focus:border-coral resize-none"
              />
              <button
                type="button"
                disabled={isPosting || !commentBody.trim()}
                onClick={submitComment}
                className="self-end font-mono text-[10px] tracking-[.04em] rounded-[6px] bg-ink text-white px-3 py-1.5 disabled:opacity-40"
              >
                {isPosting ? "Posting…" : "Post note"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
