"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import type { CheckpointSnapshotRow } from "@/lib/data/checkpoint-history";

/** Read-only view of one frozen checkpoint week -- no edit or delete
 * control anywhere in this modal, on purpose: once published, this
 * content is permanent. */
export function CheckpointSnapshotDetailButton({ snapshot, children }: { snapshot: CheckpointSnapshotRow; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data } = snapshot;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left min-w-0 w-full">
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Checkpoint archive — ${snapshot.weekLabel}`}>
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[9.5px] text-muted">
            Published {new Date(snapshot.publishedAt).toLocaleString("en-SG")}
            {snapshot.publishedByName ? ` · ${snapshot.publishedByName}` : ""}
          </span>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">BUILD-PROGRESS STATS</span>
            {data.stats.length === 0 ? (
              <span className="text-[11.5px] text-muted">None in this snapshot.</span>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.stats.map((s) => (
                  <div key={s.id} className="border border-line-soft rounded-[8px] px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-extrabold text-[14px] text-ink">{s.value}</span>
                      <span className="text-[11px] font-semibold text-ink">{s.label}</span>
                    </div>
                    {s.note ? <span className="block text-[10.5px] text-muted mt-0.5">{s.note}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">DECISIONS LOG</span>
            {data.decisions.length === 0 ? (
              <span className="text-[11.5px] text-muted">None in this snapshot.</span>
            ) : (
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {data.decisions.map((d) => (
                  <li key={d.id} className="border border-line-soft rounded-[8px] px-3 py-2">
                    <span className="block text-[11.5px] font-semibold text-ink">{d.title}</span>
                    {d.detail ? <span className="block text-[10.5px] text-muted mt-0.5">{d.detail}</span> : null}
                    <span className="block font-mono text-[9px] text-muted-2 mt-1">
                      {(d.owner ?? "NO OWNER").toUpperCase()} · {d.dueLabel ?? "no date"} · {d.status.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">THIS WEEK / NEXT WEEK</span>
            {data.commitments.length === 0 ? (
              <span className="text-[11.5px] text-muted">None in this snapshot.</span>
            ) : (
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {data.commitments.map((c) => (
                  <li key={c.id} className="border border-line-soft rounded-[8px] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-ink">{c.periodLabel}</span>
                      <span className="font-mono text-[9px] text-muted-2">{c.ownerLabel.toUpperCase()}</span>
                    </div>
                    <ul className="m-0 mt-1 pl-4 flex flex-col gap-0.5">
                      {c.items.map((item, i) => (
                        <li key={i} className="text-[11px] text-muted leading-[1.5]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">BASELINE MEASURES</span>
            {data.measures.length === 0 ? (
              <span className="text-[11.5px] text-muted">None in this snapshot.</span>
            ) : (
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {data.measures.map((m) => (
                  <li key={m.id} className="border border-line-soft rounded-[8px] px-3 py-2">
                    <span className="block text-[11.5px] font-semibold text-ink">{m.measureName}</span>
                    <span className="block text-[10.5px] text-muted mt-0.5">
                      Today: {m.todayValue} → After: {m.afterValue}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
