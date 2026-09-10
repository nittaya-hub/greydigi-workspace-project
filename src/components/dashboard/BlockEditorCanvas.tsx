"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { BlockEditorControls } from "@/components/dashboard/BlockEditorControls";
import { BLOCK_TYPES_BY_SPACE, BLOCK_TYPE_LABELS, type DashboardData } from "@/lib/dashboard/types";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardSpace, DashboardBlockType } from "@/lib/supabase/database.types";

export interface DashboardEditorActions {
  addBlock: (blockType: DashboardBlockType) => Promise<void>;
  updateBlockConfig: (blockId: string, config: Record<string, unknown>) => Promise<void>;
  updateLayout: (layout: { id: string; x: number; y: number; w: number; h: number }[]) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
}

/** The WordPress-style block editor: an "Add block" toolbar scoped to
 * what makes sense for this space (see BLOCK_TYPES_BY_SPACE), a
 * snap-to-grid canvas (DashboardGrid in edit mode), and Publish/Unpublish
 * — changes are only visible on the client portal once published, same
 * gating as the delivery Client View Config page it replaces. */
export function BlockEditorCanvas({
  space,
  blocks,
  data,
  publishedAt,
  actions,
}: {
  space: DashboardSpace;
  blocks: DashboardBlockRow[];
  data: DashboardData;
  publishedAt: string | null;
  actions: DashboardEditorActions;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {publishedAt ? <Pill tone="done">PUBLISHED</Pill> : <Pill tone="waiting_on_client">NEVER PUBLISHED</Pill>}
          {publishedAt ? <span className="text-[11.5px] text-muted">Last published {new Date(publishedAt).toLocaleString()}.</span> : null}
        </div>
        <div className="flex gap-2">
          {publishedAt ? (
            <Button variant="secondary" disabled={isPending} onClick={() => run(actions.unpublish)}>
              Unpublish
            </Button>
          ) : null}
          <Button variant="coral" disabled={isPending} onClick={() => run(actions.publish)}>
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BLOCK_TYPES_BY_SPACE[space].map((type) => (
          <button
            key={type}
            type="button"
            disabled={isPending}
            onClick={() => run(() => actions.addBlock(type))}
            className="font-mono text-[9.5px] tracking-[.05em] rounded-[6px] border border-line px-2.5 py-1.5 text-coral hover:bg-coral/5 disabled:opacity-50"
          >
            + {BLOCK_TYPE_LABELS[type].toUpperCase()}
          </button>
        ))}
      </div>

      {error ? <p className="text-[11.5px] text-block-fg">{error}</p> : null}

      <DashboardGrid
        blocks={blocks}
        data={data}
        editable
        onLayoutChange={(layout) => run(() => actions.updateLayout(layout))}
        renderBlockChrome={(block, content) => (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-line-soft bg-neutral-bg/40 cursor-move">
              <span className="font-mono text-[8.5px] tracking-[.06em] text-muted">{BLOCK_TYPE_LABELS[block.blockType].toUpperCase()}</span>
              <button
                type="button"
                onClick={() => run(() => actions.removeBlock(block.id))}
                className="font-mono text-[8.5px] text-muted hover:text-block-fg"
              >
                REMOVE
              </button>
            </div>
            <div className="px-2.5 py-1.5 border-b border-line-soft">
              <BlockEditorControls block={block} space={space} onSave={(config) => run(() => actions.updateBlockConfig(block.id, config))} />
            </div>
            <div className="flex-1 min-h-0">{content}</div>
          </div>
        )}
      />
    </div>
  );
}
