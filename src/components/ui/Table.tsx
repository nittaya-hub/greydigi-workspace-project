import { type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

/**
 * `.th` / `.tr` — the thin-bordered table rows used everywhere (gate
 * pipeline, project list, incidents, ...). Each screen defines its own
 * column widths via `cols` (a CSS grid-template-columns value), matching
 * how the design source varies it per table rather than forcing one
 * shared layout.
 */
export function TableHead({ cols, children }: { cols: string; children: ReactNode }) {
  const style: CSSProperties = { gridTemplateColumns: cols };
  return (
    <div
      style={style}
      className="grid gap-2.5 bg-[#FCFCFA] border-b border-line-soft px-4 py-2.5 font-mono text-[9px] tracking-[.08em] text-muted"
    >
      {children}
    </div>
  );
}

export function TableRow({
  cols,
  children,
  className,
  last = false,
}: {
  cols: string;
  children: ReactNode;
  className?: string;
  last?: boolean;
}) {
  const style: CSSProperties = { gridTemplateColumns: cols };
  return (
    <div
      style={style}
      className={clsx(
        "grid gap-2.5 items-center px-4 py-[11px] text-[12px]",
        !last && "border-b border-line-soft",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CellStack({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[12.5px] font-semibold text-ink truncate">{primary}</span>
      {secondary ? <span className="font-mono text-[9.5px] text-muted truncate">{secondary}</span> : null}
    </span>
  );
}
