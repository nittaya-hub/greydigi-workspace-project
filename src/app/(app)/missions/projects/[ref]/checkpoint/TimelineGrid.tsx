"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { ProjectTimelineData } from "@/lib/data/project";
import {
  seedDefaultTimelineStatuses,
  saveTimelineSettings,
  createTimelineStatus,
  updateTimelineStatus,
  deleteTimelineStatus,
  createTimelineRow,
  updateTimelineRowLabel,
  toggleTimelineRowVisible,
  reviewTimelineRow,
  deleteTimelineRow,
  setTimelineCell,
} from "./actions";

function weekLabel(index: number, week1StartDate: string | null): string {
  const base = `W${index + 1}`;
  if (!week1StartDate) return base;
  const d = new Date(week1StartDate);
  d.setDate(d.getDate() + index * 7);
  return `${base} · ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

const smallButtonClass = "!min-h-[36px] !h-9 !px-2.5 !text-[11px] w-full sm:w-auto";

export function TimelineGrid({
  data,
  projectId,
  projectRef,
  canEdit,
}: {
  data: ProjectTimelineData;
  projectId: string;
  projectRef: string;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [managingStatuses, setManagingStatuses] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [addingStatus, setAddingStatus] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const toast = useToast();

  const statusById = new Map(data.statuses.map((s) => [s.id, s] as const));
  const visibleRows = canEdit ? data.rows : data.rows.filter((r) => r.visible);

  function run(fn: () => Promise<void>, successMessage?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        if (successMessage) toast.show(successMessage, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.show(message, "error");
      }
    });
  }

  if (data.statuses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[11.5px] text-muted">No colour palette set up yet for this project&apos;s timeline.</p>
        {canEdit ? (
          <Button
            variant="secondary"
            type="button"
            className="self-start"
            disabled={isPending}
            onClick={() => run(() => seedDefaultTimelineStatuses(projectId, projectRef), "Default colours added.")}
          >
            {isPending ? "Setting up..." : "Set up the default five colours"}
          </Button>
        ) : null}
        {error ? <p className="m-0 text-[11px] text-block-fg">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit ? (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              run(() => saveTimelineSettings(projectId, projectRef, formData), "Timeline settings saved.");
            }}
          >
            <Field label="WEEKS">
              <input
                name="week_count"
                type="number"
                min={1}
                max={52}
                defaultValue={data.weekCount}
                className={`${fieldInputClass} !w-[80px]`}
              />
            </Field>
            <Field label="WEEK 1 STARTS">
              <input name="week1_start_date" type="date" defaultValue={data.week1StartDate ?? ""} className={fieldInputClass} />
            </Field>
            <Button variant="secondary" type="submit" disabled={isPending} className={smallButtonClass}>
              Save
            </Button>
          </form>
          <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setManagingStatuses((v) => !v)}>
            {managingStatuses ? "Done with colours" : "Manage colours"}
          </Button>
        </div>
      ) : null}

      {managingStatuses ? (
        <div className="flex flex-col gap-2 border border-line rounded-[9px] p-3">
          {data.statuses.map((s) =>
            editingStatusId === s.id ? (
              <form
                key={s.id}
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  run(async () => {
                    await updateTimelineStatus(s.id, projectId, projectRef, formData);
                    setEditingStatusId(null);
                  }, "Colour updated.");
                }}
              >
                <Field label="LABEL">
                  <input name="label" required defaultValue={s.label} className={`${fieldInputClass} !w-[140px]`} />
                </Field>
                <Field label="COLOUR">
                  <input name="color_hex" type="color" defaultValue={s.colorHex} className="h-10 w-14 border border-line rounded-[9px]" />
                </Field>
                <Field label="STYLE">
                  <select name="style" defaultValue={s.style} className={`${fieldInputClass} !w-[110px]`}>
                    <option value="filled">Filled</option>
                    <option value="outline">Outline</option>
                  </select>
                </Field>
                <Button variant="primary" type="submit" className={smallButtonClass}>
                  Save
                </Button>
                <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setEditingStatusId(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div key={s.id} className="flex flex-wrap items-center gap-2">
                <span
                  className="w-4 h-4 rounded-[4px] flex-none"
                  style={
                    s.style === "outline"
                      ? { border: `2px solid ${s.colorHex}`, background: "transparent" }
                      : { background: s.colorHex }
                  }
                />
                <span className="text-[11.5px] text-ink flex-1 min-w-[100px]">{s.label}</span>
                <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setEditingStatusId(s.id)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  className={smallButtonClass}
                  disabled={isPending}
                  onClick={() => run(() => deleteTimelineStatus(s.id, projectId, projectRef), "Colour deleted.")}
                >
                  Delete
                </Button>
              </div>
            )
          )}
          {addingStatus ? (
            <form
              className="flex flex-wrap items-end gap-2 pt-2 border-t border-line-soft"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                run(async () => {
                  await createTimelineStatus(projectId, projectRef, formData);
                  setAddingStatus(false);
                }, "Colour added.");
              }}
            >
              <Field label="LABEL">
                <input name="label" required className={`${fieldInputClass} !w-[140px]`} placeholder="Blocked" />
              </Field>
              <Field label="COLOUR">
                <input name="color_hex" type="color" defaultValue="#F2583E" className="h-10 w-14 border border-line rounded-[9px]" />
              </Field>
              <Field label="STYLE">
                <select name="style" defaultValue="filled" className={`${fieldInputClass} !w-[110px]`}>
                  <option value="filled">Filled</option>
                  <option value="outline">Outline</option>
                </select>
              </Field>
              <Button variant="primary" type="submit" className={smallButtonClass}>
                Add colour
              </Button>
              <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setAddingStatus(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Button variant="secondary" type="button" className={`self-start ${smallButtonClass}`} onClick={() => setAddingStatus(true)}>
              Add a colour
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {data.statuses.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-[10.5px] text-muted">
              <span
                className="w-2.5 h-2.5 rounded-full flex-none"
                style={s.style === "outline" ? { border: `2px solid ${s.colorHex}`, background: "transparent" } : { background: s.colorHex }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border border-line rounded-[9px] -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="border-collapse text-[11px] w-full">
          <thead>
            <tr>
              <th className="text-left px-2.5 py-2 border-b border-line font-mono text-[9px] text-muted-2 sticky left-0 bg-white min-w-[220px] z-10">
                ROW
              </th>
              {Array.from({ length: data.weekCount }, (_, i) => (
                <th key={i} className="px-1.5 py-2 border-b border-l border-line-soft font-mono text-[9px] text-muted-2 whitespace-nowrap min-w-[56px]">
                  {weekLabel(i, data.week1StartDate)}
                </th>
              ))}
              {canEdit ? <th className="border-b border-line min-w-[110px]" /> : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className={row.visible ? "" : "opacity-50"}>
                <td className="px-2.5 py-2 border-b border-line-soft sticky left-0 bg-white align-top min-w-[220px] z-10">
                  {editingRowId === row.id ? (
                    <form
                      className="flex flex-wrap items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        run(async () => {
                          await updateTimelineRowLabel(row.id, projectId, projectRef, formData);
                          setEditingRowId(null);
                        }, "Row updated.");
                      }}
                    >
                      <input name="label" required defaultValue={row.label} autoFocus className={`${fieldInputClass} !text-[11px]`} />
                      <Button variant="primary" type="submit" className={smallButtonClass}>
                        Save
                      </Button>
                      <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setEditingRowId(null)}>
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-semibold text-ink whitespace-normal break-words">{row.label}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.reviewedAt ? (
                          <Pill tone="done">REVIEWED{row.reviewedByName ? ` · ${row.reviewedByName.toUpperCase()}` : ""}</Pill>
                        ) : (
                          <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
                        )}
                        {!row.visible ? <Pill tone="ghost">HIDDEN</Pill> : null}
                      </div>
                    </div>
                  )}
                </td>
                {row.cells.map((statusId, weekIndex) => {
                  const status = statusId ? statusById.get(statusId) : null;
                  return (
                    <td key={weekIndex} className="px-1.5 py-2 border-b border-l border-line-soft align-middle">
                      {canEdit ? (
                        <select
                          value={statusId ?? ""}
                          disabled={isPending}
                          onChange={(e) =>
                            run(() => setTimelineCell(row.id, projectId, projectRef, weekIndex, e.target.value || null), "Cell updated.")
                          }
                          className="text-[10px] border border-line rounded-[6px] px-1 min-h-[40px] w-full bg-white touch-manipulation"
                          style={status ? { background: status.style === "filled" ? status.colorHex : "white", color: status.style === "filled" ? "white" : status.colorHex } : {}}
                        >
                          <option value="">—</option>
                          {data.statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : status ? (
                        <span
                          className="block h-5 rounded-[5px]"
                          title={status.label}
                          style={
                            status.style === "outline"
                              ? { border: `2px solid ${status.colorHex}` }
                              : { background: status.colorHex }
                          }
                        />
                      ) : (
                        <span className="block h-5" />
                      )}
                    </td>
                  );
                })}
                {canEdit ? (
                  <td className="px-1.5 py-2 border-b border-line-soft align-top">
                    <div className="flex flex-col gap-1.5 items-stretch min-w-[100px]">
                      <Button variant="secondary" type="button" className={smallButtonClass} onClick={() => setEditingRowId(row.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        type="button"
                        className={smallButtonClass}
                        disabled={isPending}
                        onClick={() =>
                          run(
                            () => toggleTimelineRowVisible(row.id, projectId, projectRef, !row.visible),
                            row.visible ? "Row hidden from client view." : "Row shown to client view."
                          )
                        }
                      >
                        {row.visible ? "Hide" : "Show"}
                      </Button>
                      {!row.reviewedAt ? (
                        <Button
                          variant="secondary"
                          type="button"
                          className={smallButtonClass}
                          disabled={isPending}
                          onClick={() => run(() => reviewTimelineRow(row.id, projectId, projectRef), "Row marked reviewed.")}
                        >
                          Mark reviewed
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        type="button"
                        className={smallButtonClass}
                        disabled={isPending}
                        onClick={() => run(() => deleteTimelineRow(row.id, projectId, projectRef), "Row deleted.")}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="m-0 text-[11px] text-block-fg">{error}</p> : null}

      {canEdit ? (
        addingRow ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              run(async () => {
                await createTimelineRow(projectId, projectRef, formData);
                setAddingRow(false);
              }, "Row added.");
            }}
          >
            <Field label="ROW LABEL">
              <input name="label" required autoFocus className={fieldInputClass} placeholder="Xero write-back and supplier records" />
            </Field>
            <Button variant="primary" type="submit" className="w-full sm:w-auto">
              Add row
            </Button>
            <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => setAddingRow(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button variant="secondary" type="button" className="self-start" onClick={() => setAddingRow(true)}>
            Add a row
          </Button>
        )
      ) : null}
    </div>
  );
}
