"use client";

import { useMemo, useRef } from "react";
import { Responsive, useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { DashboardBlockRow, DashboardData } from "@/lib/dashboard/types";
import { BlockRenderer } from "@/components/dashboard/BlockRenderer";

const BREAKPOINTS = { lg: 1024, sm: 0 };
const COLS = { lg: 12, sm: 4 };

/** The Notion/Retool-style snap-to-grid surface every dashboard renders
 * on — never a free-pixel canvas. In edit mode (`editable`), drag/resize
 * is live and debounced into `onLayoutChange`; the read-only portal view
 * passes the same component with dragging/resizing turned off so a
 * client and an admin see identical positioning. */
export function DashboardGrid({
  blocks,
  data,
  editable = false,
  onLayoutChange,
  renderBlockChrome,
}: {
  blocks: DashboardBlockRow[];
  data: DashboardData;
  editable?: boolean;
  onLayoutChange?: (layout: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  renderBlockChrome?: (block: DashboardBlockRow, content: React.ReactNode) => React.ReactNode;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layout: Layout = useMemo(
    () => blocks.map((b) => ({ i: b.id, x: b.gridX, y: b.gridY, w: b.gridW, h: b.gridH })),
    [blocks]
  );

  function handleLayoutChange(next: Layout) {
    if (!editable || !onLayoutChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onLayoutChange(next.map((item) => ({ id: item.i, x: item.x, y: item.y, w: item.w, h: item.h })));
    }, 500);
  }

  if (blocks.length === 0) {
    return (
      <div ref={containerRef} className="rounded-[12px] border border-dashed border-line p-8 text-center text-[12px] text-muted">
        No blocks yet.
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {mounted ? (
        <Responsive
          layouts={{ lg: layout, sm: layout }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          width={width}
          rowHeight={28}
          margin={[10, 10]}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ enabled: editable }}
          resizeConfig={{ enabled: editable }}
        >
          {blocks.map((block) => {
            const content = <BlockRenderer block={block} data={data} />;
            return (
              <div key={block.id} className="bg-white border border-line rounded-[10px] overflow-hidden">
                {renderBlockChrome ? renderBlockChrome(block, content) : content}
              </div>
            );
          })}
        </Responsive>
      ) : null}
    </div>
  );
}
