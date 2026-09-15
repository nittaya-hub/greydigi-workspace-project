"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { upsertRunBook, logScheduledHealthCheck } from "./blueprint-actions";
import type { RunBookRow } from "@/lib/data/hypercare-blueprint";

export function RunBookCard({ serviceId, serviceRef, runBook }: { serviceId: string; serviceRef: string; runBook: RunBookRow | null }) {
  const [editing, setEditing] = useState(!runBook);
  const [isPending, startTransition] = useTransition();
  const [checkPending, startCheckTransition] = useTransition();

  return (
    <Card>
      <CardHeader title="Run book" note={runBook ? `UPDATED ${new Date(runBook.updatedAt).toLocaleDateString()}` : "NOT WRITTEN"} />
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                await upsertRunBook(serviceId, serviceRef, formData);
                setEditing(false);
              });
            }}
            className="flex flex-col gap-2.5"
          >
            <Field label="DEPENDENCIES">
              <textarea name="dependencies" rows={2} defaultValue={runBook?.dependencies ?? ""} className={fieldInputClass} />
            </Field>
            <Field label="RECOVERY STEPS">
              <textarea name="recoverySteps" rows={3} defaultValue={runBook?.recoverySteps ?? ""} className={fieldInputClass} />
            </Field>
            <Field label="ESCALATION PATH">
              <textarea name="escalationPath" rows={2} defaultValue={runBook?.escalationPath ?? ""} className={fieldInputClass} />
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save run book"}
              </Button>
              {runBook ? (
                <Button variant="secondary" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : runBook ? (
          <>
            <div className="flex flex-col gap-1.5 text-[12px]">
              {runBook.dependencies ? (
                <span>
                  <span className="text-muted">Dependencies: </span>
                  {runBook.dependencies}
                </span>
              ) : null}
              {runBook.recoverySteps ? (
                <span>
                  <span className="text-muted">Recovery: </span>
                  {runBook.recoverySteps}
                </span>
              ) : null}
              {runBook.escalationPath ? (
                <span>
                  <span className="text-muted">Escalation: </span>
                  {runBook.escalationPath}
                </span>
              ) : null}
              {runBook.ownerName ? (
                <span>
                  <span className="text-muted">Owner: </span>
                  {runBook.ownerName}
                </span>
              ) : null}
            </div>
            <Button variant="secondary" className="self-start" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        ) : null}

        {runBook ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startCheckTransition(async () => {
                await logScheduledHealthCheck(serviceId, serviceRef, formData);
                e.currentTarget?.reset();
              });
            }}
            className="flex items-end gap-2 pt-2 border-t border-line-soft"
          >
            <Field label="LOG A SCHEDULED HEALTH CHECK">
              <input name="notes" className={fieldInputClass} placeholder="What was checked" />
            </Field>
            <label className="flex items-center gap-1.5 text-[11px] text-muted pb-2">
              <input type="checkbox" name="foundIssue" /> Found an issue
            </label>
            <Button variant="secondary" type="submit" disabled={checkPending}>
              {checkPending ? "Logging..." : "Log check"}
            </Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
