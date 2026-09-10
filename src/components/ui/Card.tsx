import { type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

/** `.card` — white surface, thin line border, 12px radius. The workhorse
 * container used everywhere: gate pipelines, stat groups, tables.
 * overflow-x-auto (rather than plain overflow-hidden) so a table with
 * fixed-width grid columns can scroll horizontally instead of blowing out
 * the layout on a narrow phone screen — the common case, since Card wraps
 * nearly every TableHead/TableRow in the app. overflow-y stays hidden so
 * rounded corners still clip a header/footer meeting the card's border. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white border border-line rounded-[12px] overflow-x-auto overflow-y-hidden", className)}>
      {children}
    </div>
  );
}

/** `.ch` — card header: title left, mono eyebrow note right. */
export function CardHeader({
  title,
  note,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line",
        className
      )}
    >
      <span className="font-display font-extrabold text-[13.5px] text-ink">{title}</span>
      {note ? <Eyebrow>{note}</Eyebrow> : null}
    </div>
  );
}

/** `.eb` — mono eyebrow label used constantly: card notes, section labels. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("font-mono text-[9px] tracking-[.09em] text-muted", className)}>
      {children}
    </span>
  );
}

/** `.tile` — a single stat card: eyebrow, big number, small note. Pass
 * `href` to make the whole tile a link to wherever that number's detail
 * lives (e.g. "BLOCKED GATES" → /delivery/gates) — plain browser/Next
 * navigation, so the back button returns here exactly as it left it.
 * Omit `href` for a purely informational tile (e.g. inside a preview
 * panel that isn't itself a real page to link to). */
export function StatTile({
  label,
  value,
  note,
  accent = false,
  className,
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  accent?: boolean;
  className?: string;
  href?: string;
}) {
  const content = (
    <>
      <Eyebrow>{label}</Eyebrow>
      <span
        className={clsx(
          "font-display font-extrabold text-[26px] tracking-[-0.03em]",
          accent ? "text-coral" : "text-ink"
        )}
      >
        {value}
      </span>
      {note ? <span className="text-[11px] text-muted">{note}</span> : null}
    </>
  );
  const tileClass = clsx(
    "min-w-0 bg-white border border-line rounded-[12px] px-[15px] pt-[14px] pb-[13px] flex flex-col gap-[5px]",
    href && "transition-colors hover:border-coral/40 hover:bg-coral-tint/30",
    className
  );
  if (href) {
    return (
      <Link href={href} className={tileClass}>
        {content}
      </Link>
    );
  }
  return <div className={tileClass}>{content}</div>;
}

/** `.hero` — the dark "where we are" panel: answers the single most
 * important fact on a page before anything else. */
export function HeroPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0 bg-ink text-[#EDEEF1] rounded-[12px] p-5 flex flex-col gap-3", className)}>
      {children}
    </div>
  );
}

/** `.empty` — empty state: name, explanation, one action. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="py-[34px] px-4 flex flex-col items-center gap-2 text-center">
      <span className="font-semibold text-[12.5px] text-ink">{title}</span>
      {description ? (
        <span className="text-[11.5px] text-muted max-w-[46ch]">{description}</span>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** `.rule` + `.h1` + `.sub` — the accent bar / title / subtitle group that
 * opens every screen. */
export function PageHeading({
  title,
  description,
  eyebrow,
  size = "lg",
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1
        className={clsx(
          "m-0 font-display font-extrabold tracking-[-0.02em] text-ink",
          size === "lg" ? "text-[23px]" : "text-[20px]"
        )}
      >
        {title}
      </h1>
      {description ? <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">{description}</p> : null}
    </div>
  );
}
