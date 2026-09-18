"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/shadcn/sheet";
import type { ProjectArchitectureData, ArchitectureColumn, ArchitectureNode } from "@/lib/data/architecture";
import {
  createArchitectureColumn,
  updateArchitectureColumn,
  deleteArchitectureColumn,
  createArchitectureNode,
  updateArchitectureNode,
  deleteArchitectureNode,
  createArchitectureEdge,
  deleteArchitectureEdge,
} from "./actions";

type Rect = { left: number; top: number; width: number; height: number };

const iconInputClass = `${fieldInputClass} !w-[56px] text-center`;

export function ArchitectureDiagram({
  data,
  projectId,
  projectRef,
  canEdit,
}: {
  data: ProjectArchitectureData;
  projectId: string;
  projectRef: string;
  canEdit: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ArchitectureColumn | null>(null);
  const [addingNodeColumnId, setAddingNodeColumnId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<ArchitectureNode | null>(null);
  const [addingEdge, setAddingEdge] = useState(false);
  const [viewingColumn, setViewingColumn] = useState<ArchitectureColumn | null>(null);

  function remeasure() {
    const next: Record<string, Rect> = {};
    for (const [id, el] of nodeRefs.current) {
      next[id] = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    }
    setRects(next);
    if (containerRef.current) {
      setSvgSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
    }
  }

  useLayoutEffect(() => {
    // Measuring the DOM after layout and feeding the result back into
    // state is exactly what positions the SVG edges -- there's no
    // external system to subscribe to here, only the browser's own
    // layout, so this is the legitimate exception the rule allows for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    remeasure();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => remeasure());
    ro.observe(container);
    for (const el of nodeRefs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  function run(fn: () => Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await fn();
        if (successMessage) toast.show(successMessage, "success");
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    });
  }

  const allNodes = data.columns.flatMap((c) => c.nodes.map((n) => ({ ...n, columnLabel: c.label })));
  const nodeById = new Map(allNodes.map((n) => [n.id, n] as const));

  if (data.columns.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[11.5px] text-muted">No columns yet. Add the first one, or upload an Excel mapping above.</p>
        {canEdit ? (
          <Button variant="secondary" type="button" className="self-start" onClick={() => setAddingColumn(true)}>
            Add a column
          </Button>
        ) : null}
        {addingColumn ? (
          <ColumnForm
            onCancel={() => setAddingColumn(false)}
            onSubmit={(formData) =>
              run(async () => {
                await createArchitectureColumn(projectId, projectRef, formData);
                setAddingColumn(false);
              }, "Column added.")
            }
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="relative overflow-x-auto -mx-3 px-3 py-3 sm:mx-0 sm:px-3 rounded-[10px]"
        style={{ background: "var(--color-canvas)" }}
      >
        <svg
          width={svgSize.width}
          height={svgSize.height}
          className="absolute left-0 top-0 pointer-events-none"
          style={{ overflow: "visible" }}
        >
          <defs>
            <marker id="arch-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-ink-soft)" />
            </marker>
          </defs>
          {data.edges.map((edge) => {
            const from = rects[edge.fromNodeId];
            const to = rects[edge.toNodeId];
            if (!from || !to) return null;
            const x1 = from.left + from.width;
            const y1 = from.top + from.height / 2;
            const x2 = to.left;
            const y2 = to.top + to.height / 2;
            const bend = Math.max(32, Math.abs(x2 - x1) / 2);
            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="var(--color-ink-soft)"
                strokeWidth={2}
                markerEnd="url(#arch-arrow)"
              />
            );
          })}
        </svg>

        {data.edges.map((edge) => {
          const from = rects[edge.fromNodeId];
          const to = rects[edge.toNodeId];
          if (!from || !to || !edge.label) return null;
          const midX = (from.left + from.width + to.left) / 2;
          const midY = (from.top + from.height / 2 + to.top + to.height / 2) / 2;
          return (
            <span
              key={edge.id}
              className="absolute font-mono text-[9px] text-ink bg-white border border-line-soft px-1.5 py-0.5 rounded-[4px] whitespace-nowrap pointer-events-none shadow-sm"
              style={{ left: midX, top: midY, transform: "translate(-50%, -50%)" }}
            >
              {edge.label}
            </span>
          );
        })}

        <div className="relative flex items-start gap-3 pb-2">
          {data.columns.map((column) => (
            <div key={column.id} className="flex-none w-[220px] flex flex-col gap-2 border border-line rounded-[9px] bg-white shadow-sm p-2">
              <div
                className="flex items-center gap-1.5 px-1 pb-1.5 border-b-2"
                style={{ borderColor: column.colorHex ?? "var(--color-line)" }}
              >
                {column.icon ? <span className="text-[14px] leading-none">{column.icon}</span> : null}
                <button
                  type="button"
                  onClick={() => setViewingColumn(column)}
                  className="flex-1 min-w-0 text-left min-h-[28px] text-[11.5px] font-semibold text-ink truncate hover:underline"
                  title="View everything in this column"
                >
                  {column.label}
                </button>
                {canEdit ? (
                  <div className="flex gap-1 flex-none">
                    <button
                      type="button"
                      onClick={() => setEditingColumn(column)}
                      className="min-h-[28px] min-w-[28px] text-[10px] text-muted hover:text-ink"
                      aria-label="Edit column"
                    >
                      Edit
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                {column.nodes.length === 0 ? (
                  <span className="text-[10.5px] text-muted-2 px-1">No modules yet.</span>
                ) : (
                  column.nodes.map((node) => (
                    <div
                      key={node.id}
                      ref={(el) => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else nodeRefs.current.delete(node.id);
                      }}
                      onClick={() => canEdit && setEditingNode(node)}
                      className={`rounded-[8px] border border-line-soft bg-white px-2.5 py-2 flex flex-col gap-0.5 ${
                        canEdit ? "cursor-pointer hover:border-coral/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {node.icon ? <span className="text-[12px] leading-none flex-none">{node.icon}</span> : null}
                        <span className="text-[11px] font-semibold text-ink leading-[1.3]">{node.label}</span>
                      </div>
                      {node.detail ? <span className="text-[10px] text-muted leading-[1.4]">{node.detail}</span> : null}
                    </div>
                  ))
                )}
              </div>

              {canEdit ? (
                <Button
                  variant="secondary"
                  type="button"
                  className="!min-h-[32px] !h-8 !text-[10.5px]"
                  onClick={() => setAddingNodeColumnId(column.id)}
                >
                  Add module
                </Button>
              ) : null}
            </div>
          ))}

          {canEdit ? (
            <Button
              variant="secondary"
              type="button"
              className="flex-none !min-h-[40px] self-start"
              onClick={() => setAddingColumn(true)}
            >
              Add column
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9.5px] text-muted">
            CONNECTIONS {data.edges.length > 0 ? `· ${data.edges.length}` : ""}
          </span>
          {canEdit && allNodes.length >= 2 ? (
            <Button variant="secondary" type="button" className="!min-h-[32px] !h-8 !text-[10.5px]" onClick={() => setAddingEdge(true)}>
              Add a connection
            </Button>
          ) : null}
        </div>
        {data.edges.length === 0 ? (
          <span className="text-[11px] text-muted-2">No connections yet.</span>
        ) : (
          <div className="flex flex-col gap-1">
            {data.edges.map((edge) => {
              const from = nodeById.get(edge.fromNodeId);
              const to = nodeById.get(edge.toNodeId);
              return (
                <div key={edge.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-ink flex-1 min-w-0 truncate">
                    {from?.label ?? "—"} <span className="text-muted-2">→</span> {to?.label ?? "—"}
                    {edge.label ? <span className="text-muted"> · {edge.label}</span> : null}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => deleteArchitectureEdge(edge.id, projectId, projectRef), "Connection deleted.")}
                      className="min-h-[28px] text-[10px] text-coral-strong flex-none"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column add/edit */}
      <Modal open={addingColumn} onClose={() => setAddingColumn(false)} title="Add a column">
        <ColumnForm
          onCancel={() => setAddingColumn(false)}
          onSubmit={(formData) =>
            run(async () => {
              await createArchitectureColumn(projectId, projectRef, formData);
              setAddingColumn(false);
            }, "Column added.")
          }
        />
      </Modal>
      <Modal open={!!editingColumn} onClose={() => setEditingColumn(null)} title="Edit column">
        {editingColumn ? (
          <ColumnForm
            column={editingColumn}
            onCancel={() => setEditingColumn(null)}
            onDelete={() =>
              run(async () => {
                await deleteArchitectureColumn(editingColumn.id, projectId, projectRef);
                setEditingColumn(null);
              }, "Column deleted.")
            }
            onSubmit={(formData) =>
              run(async () => {
                await updateArchitectureColumn(editingColumn.id, projectId, projectRef, formData);
                setEditingColumn(null);
              }, "Column updated.")
            }
          />
        ) : null}
      </Modal>

      {/* Node add/edit */}
      <Modal open={!!addingNodeColumnId} onClose={() => setAddingNodeColumnId(null)} title="Add a module">
        <NodeForm
          onCancel={() => setAddingNodeColumnId(null)}
          onSubmit={(formData) =>
            run(async () => {
              await createArchitectureNode(addingNodeColumnId!, projectId, projectRef, formData);
              setAddingNodeColumnId(null);
            }, "Module added.")
          }
        />
      </Modal>
      <Modal open={!!editingNode} onClose={() => setEditingNode(null)} title="Edit module">
        {editingNode ? (
          <NodeForm
            node={editingNode}
            onCancel={() => setEditingNode(null)}
            onDelete={() =>
              run(async () => {
                await deleteArchitectureNode(editingNode.id, projectId, projectRef);
                setEditingNode(null);
              }, "Module deleted.")
            }
            onSubmit={(formData) =>
              run(async () => {
                await updateArchitectureNode(editingNode.id, projectId, projectRef, formData);
                setEditingNode(null);
              }, "Module updated.")
            }
          />
        ) : null}
      </Modal>

      {/* Edge add */}
      <Modal open={addingEdge} onClose={() => setAddingEdge(false)} title="Add a connection">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const fromNodeId = formData.get("from") as string;
            const toNodeId = formData.get("to") as string;
            const label = formData.get("label") as string;
            run(async () => {
              await createArchitectureEdge(projectId, projectRef, { fromNodeId, toNodeId, label });
              setAddingEdge(false);
            }, "Connection added.");
          }}
        >
          <Field label="FROM">
            <select name="from" required className={fieldInputClass} defaultValue="">
              <option value="" disabled>
                Choose a module
              </option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.columnLabel} · {n.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="TO">
            <select name="to" required className={fieldInputClass} defaultValue="">
              <option value="" disabled>
                Choose a module
              </option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.columnLabel} · {n.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="LABEL (OPTIONAL)">
            <input name="label" className={fieldInputClass} placeholder="source = api_pull" />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" type="submit">
              Add connection
            </Button>
            <Button variant="secondary" type="button" onClick={() => setAddingEdge(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Column detail -- click a column's heading to read everything
          under it in one clean list, rather than only the compact
          inline cards. */}
      <Sheet open={!!viewingColumn} onOpenChange={(open) => !open && setViewingColumn(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[420px] overflow-y-auto">
          {viewingColumn ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {viewingColumn.icon ? <span>{viewingColumn.icon}</span> : null}
                  {viewingColumn.label}
                </SheetTitle>
                <SheetDescription>{viewingColumn.nodes.length} module(s) in this column.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-2 px-4 pb-4">
                {viewingColumn.nodes.length === 0 ? (
                  <span className="text-[12px] text-muted">No modules yet.</span>
                ) : (
                  viewingColumn.nodes.map((node) => (
                    <div key={node.id} className="rounded-[8px] border border-line-soft px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {node.icon ? <span className="text-[13px] leading-none">{node.icon}</span> : null}
                        <span className="text-[12.5px] font-semibold text-ink">{node.label}</span>
                      </div>
                      {node.detail ? <span className="block text-[11px] text-muted leading-[1.5] mt-0.5">{node.detail}</span> : null}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ColumnForm({
  column,
  onSubmit,
  onCancel,
  onDelete,
}: {
  column?: ArchitectureColumn;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div className="flex gap-2">
        <Field label="ICON (OPTIONAL)">
          <input name="icon" defaultValue={column?.icon ?? ""} maxLength={4} className={iconInputClass} placeholder="🛍️" />
        </Field>
        <Field label="LABEL">
          <input name="label" required autoFocus defaultValue={column?.label ?? ""} className={fieldInputClass} placeholder="Shopify (external source)" />
        </Field>
      </div>
      <Field label="ACCENT COLOUR (OPTIONAL)">
        <input name="color_hex" type="color" defaultValue={column?.colorHex ?? "#1F2738"} className="h-10 w-16 border border-line rounded-[9px]" />
      </Field>
      <div className="flex gap-2 items-center">
        <Button variant="primary" type="submit">
          Save
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button variant="secondary" type="button" className="ml-auto text-coral-strong" onClick={onDelete}>
            Delete column
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function NodeForm({
  node,
  onSubmit,
  onCancel,
  onDelete,
}: {
  node?: ArchitectureNode;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div className="flex gap-2">
        <Field label="ICON (OPTIONAL)">
          <input name="icon" defaultValue={node?.icon ?? ""} maxLength={4} className={iconInputClass} placeholder="🗄️" />
        </Field>
        <Field label="LABEL">
          <input name="label" required autoFocus defaultValue={node?.label ?? ""} className={fieldInputClass} placeholder="platform.shopify_orders_current" />
        </Field>
      </div>
      <Field label="DETAIL (OPTIONAL)">
        <textarea name="detail" rows={2} defaultValue={node?.detail ?? ""} className={fieldInputClass} placeholder="1 row / order, latest raw Shopify state" />
      </Field>
      <div className="flex gap-2 items-center">
        <Button variant="primary" type="submit">
          Save
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button variant="secondary" type="button" className="ml-auto text-coral-strong" onClick={onDelete}>
            Delete module
          </Button>
        ) : null}
      </div>
    </form>
  );
}
