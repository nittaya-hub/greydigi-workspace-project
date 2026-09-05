import clsx from "clsx";

export interface PhaseSpineSegment {
  code: string;
  /** done (completed), current (in progress / held here), or future. */
  state: "done" | "current" | "future";
}

/** The seven-phase progress bar used on the shell, project overview hero,
 * and the methodology core card. Segment color is the only thing that
 * changes meaning — done phases are ink, the current phase is coral,
 * everything ahead is neutral. */
export function PhaseSpine({
  segments,
  showLabels = true,
  dark = false,
  thickness = "md",
}: {
  segments: PhaseSpineSegment[];
  showLabels?: boolean;
  dark?: boolean;
  thickness?: "sm" | "md";
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={clsx("flex", thickness === "sm" ? "gap-[3px]" : "gap-1")}>
        {segments.map((seg, i) => (
          <span
            key={seg.code + i}
            className={clsx(
              "flex-1 rounded-[3px]",
              thickness === "sm" ? "h-[5px]" : "h-[6px]",
              seg.state === "done" && "bg-ink",
              seg.state === "current" && "bg-coral",
              seg.state === "future" && (dark ? "bg-white/15" : "bg-[#DCD8CE]")
            )}
          />
        ))}
      </div>
      {showLabels ? (
        <div className={clsx("flex justify-between font-mono text-[9px]", dark ? "text-muted-2" : "text-muted")}>
          {segments.map((seg, i) => (
            <span key={seg.code + i}>{seg.code}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
