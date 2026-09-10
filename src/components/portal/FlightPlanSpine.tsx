"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Eyebrow } from "@/components/ui/Card";

type Phase = {
  code: string;
  name: string;
  index: number;
  started_at: string | null;
  completed_at: string | null;
  /** Team-set caption (e.g. "Weeks 1 to 3") — see 0018_flight_plan_duration_labels.sql.
   * Optional: older callers that don't have it yet fall back to the date caption. */
  duration_label?: string | null;
  show_duration_label?: boolean;
};
type Gate = { code: string; name: string; sequence: number; status: string; target_date: string | null };

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The "where we are on the flight plan" visual — a row of phase cards
 * (name + real start/complete dates, not a fabricated day/week template
 * offset) with the in-progress phase highlighted, and a row of gate
 * checkpoints below it. Mirrors the flight-plan deck's spine, built from
 * the same project_phases/project_gates rows the internal app already
 * uses (fn_client_portal_project, gated by client_view_configs.fields —
 * see supabase/migrations/0016_client_portal_security_definer_and_gates.sql).
 *
 * Deliberately one long row, not a wrapping grid — cards keep a fixed
 * legible width (min-w-[104px]) instead of shrinking to force everything
 * onto one screen's width, and the row scrolls horizontally instead of
 * breaking onto a second line. Centers on the current phase once, on
 * load, so both earlier and later phases stay reachable by scrolling
 * either direction instead of the row resting at phase 00 with the
 * phase that actually matters scrolled out of view.
 *
 * `dark` (default true) picks the palette: true for the client portal's
 * dark hero panel, false for use on light Card backgrounds (e.g. the
 * internal Flight plans list). */
export function FlightPlanSpine({ phases, gates, dark = true }: { phases: Phase[]; gates?: Gate[]; dark?: boolean }) {
  const currentCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentCardRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  if (phases.length === 0) return null;
  const currentIndex = phases.find((p) => p.started_at && !p.completed_at)?.index;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {/* pt-[18px] reserves real space above the cards for the TODAY
          label below — not a negative offset escaping the row, which is
          what caused it to get clipped by this container's own
          overflow-x-auto (setting overflow-x to anything but "visible"
          computes overflow-y to "auto" too per the CSS spec, so content
          poking above the row via a negative top was fighting the
          container's own scroll box). Padding is still inside the box,
          so the label sits inside it instead of behind it. */}
      <div className="flex gap-[6px] overflow-x-auto pt-[18px] pb-0.5 -mx-0.5 px-0.5">
        {phases.map((p, i) => {
          const isCurrent = p.index === currentIndex;
          const isDone = !!p.completed_at;
          return (
            <div key={p.code} ref={isCurrent ? currentCardRef : undefined} className="flex-1 min-w-[104px] flex items-stretch gap-[6px]">
              <div
                className={clsx(
                  "flex-1 min-w-0 rounded-[9px] border px-2 py-2 flex flex-col gap-0.5",
                  isCurrent
                    ? "border-coral bg-coral/15"
                    : dark
                      ? "border-white/10 bg-white/5"
                      : "border-line-soft bg-[#FCFCFA]"
                )}
              >
                <span className={clsx("font-mono text-[9px]", isCurrent ? "text-coral-strong" : dark ? "text-muted-2" : "text-muted")}>
                  {p.code}
                </span>
                <span
                  className={clsx(
                    "text-[10.5px] font-semibold leading-tight",
                    isCurrent ? (dark ? "text-white" : "text-ink") : dark ? "text-[#D6D9E0]" : "text-ink"
                  )}
                >
                  {p.name}
                </span>
                <span className={clsx("font-mono text-[8.5px] leading-snug", dark ? "text-muted-2" : "text-muted")}>
                  {p.show_duration_label !== false && p.duration_label
                    ? p.duration_label
                    : isDone
                      ? `Done ${fmt(p.completed_at)}`
                      : isCurrent
                        ? `Since ${fmt(p.started_at)}`
                        : "Not started"}
                </span>
              </div>
              {/* The "we are between phase N and N+1" marker: a vertical
                  line right after whichever phase is current, with the
                  TODAY caption floating in the pt-[18px] gutter reserved
                  above — that gutter is empty space above every card, so
                  the label can't collide with a neighbour's border no
                  matter how wide the text is. */}
              {isCurrent && i < phases.length - 1 ? (
                <div
                  className={clsx("relative flex-none w-px self-stretch", dark ? "bg-coral" : "bg-coral-strong")}
                  aria-hidden
                >
                  <span
                    className={clsx(
                      "absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-semibold tracking-[.03em]",
                      dark ? "text-coral" : "text-coral-strong"
                    )}
                  >
                    TODAY — Phase {p.code}, {p.name}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {gates && gates.length > 0 ? (
        <div className="flex flex-col gap-1.5 pt-1 min-w-0">
          <Eyebrow className={dark ? "text-muted-2" : "text-muted"}>GATES</Eyebrow>
          <div className="flex items-stretch gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {gates
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((g) => {
                const held = g.status === "held";
                const cleared = g.status === "cleared";
                return (
                  <div
                    key={g.code}
                    className={clsx(
                      "flex-1 min-w-[104px] rounded-[8px] px-2 py-1.5 flex flex-col gap-0.5 border",
                      held
                        ? "border-coral bg-coral/15"
                        : dark
                          ? "border-white/10 bg-white/5"
                          : cleared
                            ? "border-line-soft bg-[#FCFCFA]"
                            : "border-line bg-transparent"
                    )}
                  >
                    <span className={clsx("font-mono text-[9px]", held ? "text-coral-strong" : dark ? "text-muted-2" : "text-muted")}>
                      {g.code}
                    </span>
                    <span className={clsx("text-[9.5px] leading-snug", dark ? "text-[#D6D9E0]" : "text-ink")}>{g.name}</span>
                    <span className={clsx("font-mono text-[8px]", dark ? "text-muted-2" : "text-muted")}>
                      {held ? "HELD" : cleared ? "CLEARED" : "ON PLAN"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
