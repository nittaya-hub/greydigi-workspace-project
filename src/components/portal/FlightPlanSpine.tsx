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
 * `dark` (default true) picks the palette: true for the client portal's
 * dark hero panel, false for use on light Card backgrounds (e.g. the
 * internal Flight plans list). */
export function FlightPlanSpine({ phases, gates, dark = true }: { phases: Phase[]; gates?: Gate[]; dark?: boolean }) {
  if (phases.length === 0) return null;
  const currentIndex = phases.find((p) => p.started_at && !p.completed_at)?.index;

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex gap-[6px] overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {phases.map((p) => {
          const isCurrent = p.index === currentIndex;
          const isDone = !!p.completed_at;
          return (
            <div
              key={p.code}
              className={clsx(
                "flex-1 min-w-[104px] rounded-[9px] border px-2 py-2 flex flex-col gap-0.5",
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
                      {held ? "HELD" : cleared ? "CLEARED" : g.target_date ? fmt(g.target_date) : "ON PLAN"}
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
