"use client";

import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { revokeHypercareReport } from "./actions";

export function RevokeReportButton({ reportId, clientId }: { reportId: string; clientId: string }) {
  return (
    <ConfirmButton
      triggerLabel="REVOKE"
      triggerClassName="font-mono text-[9px] text-muted hover:text-block-fg"
      title="Revoke this report link"
      message="Anyone with this link will stop being able to open it. This can't be undone — publish a new report if you need a working link again."
      confirmLabel="Revoke link"
      onConfirm={() => revokeHypercareReport(reportId, clientId)}
    />
  );
}
