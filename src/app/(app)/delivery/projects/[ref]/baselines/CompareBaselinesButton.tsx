"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface CompareBaselineRow {
  id: string;
  version: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  scopeSnapshot: unknown;
}

export function CompareBaselinesButton({ baselines }: { baselines: CompareBaselineRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" className="flex-none" onClick={() => setOpen(true)}>
        Compare versions
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compare baselines">
        <div className="flex flex-col gap-3">
          {baselines.map((b) => (
            <div key={b.id} className="border border-line rounded-[9px] p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-[13px] text-ink">{b.version}</span>
                <span className="font-mono text-[9px] tracking-[.08em] text-muted">{b.status.toUpperCase()}</span>
              </div>
              <span className="font-mono text-[9.5px] text-muted">
                Created {b.createdAt.slice(0, 10)}
                {b.approvedAt ? ` · Approved ${b.approvedAt.slice(0, 10)}` : ""}
              </span>
              <pre className="text-[10.5px] bg-canvas border border-line-soft rounded-[7px] p-2.5 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(b.scopeSnapshot, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
