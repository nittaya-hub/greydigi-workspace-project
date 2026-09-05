import clsx from "clsx";

/** A single gate condition line: checkbox, description, status note. Met
 * conditions get a filled ink-green check; open ones get a coral outline. */
export function GateConditionRow({
  description,
  met,
  note,
}: {
  description: string;
  met: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-[9px] text-[12px]">
      <span
        className={clsx(
          "flex-none w-[15px] h-[15px] rounded-[4px] flex items-center justify-center text-[9px]",
          met ? "bg-ok-fg text-white" : "border-[1.5px] border-coral"
        )}
      >
        {met ? "✓" : null}
      </span>
      <span className="flex-1 text-ink">{description}</span>
      {note ? (
        <span className={clsx("font-mono text-[9.5px]", met ? "text-muted" : "text-block-fg")}>{note}</span>
      ) : null}
    </div>
  );
}
