import clsx from "clsx";
import { Eyebrow } from "@/components/ui/Card";
import { buildGanttChart, STATUS_GROUP_LABEL, STATUS_GROUP_ORDER, type GanttRow, type GanttStatusGroup } from "@/lib/timeline/gantt";

type Phase = { id: string; started_at: string | null };
type Task = {
  ref: string;
  title: string;
  status: string;
  due_date: string | null;
  is_critical_path: boolean;
  client_visible_date: string | null;
  project_phase_id: string | null;
};

const LABEL_COL = "200px";

const GROUP_DOT: Record<GanttStatusGroup, string> = {
  done: "bg-ok-fg",
  in_progress: "bg-coral",
  upcoming: "bg-idle-fg",
};

function cellClasses(status: GanttStatusGroup, isMilestone: boolean, dark: boolean): string {
  if (isMilestone) {
    // A milestone still belongs to its real done/in-progress/upcoming
    // group (color), just drawn as an outline instead of a solid fill —
    // "this is a dated deliverable" is a separate fact from "where it
    // stands", so it shouldn't override the group it renders in.
    switch (status) {
      case "done":
        return "bg-transparent border-2 border-ok-fg";
      case "in_progress":
        return "bg-transparent border-2 border-coral";
      case "upcoming":
        return clsx("bg-transparent border-2", dark ? "border-white/40" : "border-idle-fg");
    }
  }
  switch (status) {
    case "done":
      return "bg-ok-fg";
    case "in_progress":
      return "bg-coral";
    case "upcoming":
      return dark ? "bg-white/20" : "bg-idle-bg";
  }
}

function GroupSection({
  group,
  rows,
  weekCount,
  todayWeek,
  gridTemplate,
  dark,
}: {
  group: GanttStatusGroup;
  rows: GanttRow[];
  weekCount: number;
  todayWeek: number;
  gridTemplate: string;
  dark: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex items-center gap-1.5 pt-2 pb-0.5">
        <span className={clsx("inline-block w-2 h-2 rounded-full", GROUP_DOT[group])} />
        <span className={clsx("font-mono text-[10px] tracking-[.06em] uppercase", dark ? "text-muted-2" : "text-muted")}>
          {STATUS_GROUP_LABEL[group]} · {rows.length}
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.ref} className="grid items-center gap-[4px]" style={{ gridTemplateColumns: gridTemplate }}>
          <div
            className={clsx(
              "min-w-0 pr-2 truncate text-[12px]",
              row.isCriticalPath ? "font-semibold" : "",
              dark ? "text-[#D6D9E0]" : "text-ink"
            )}
            title={row.title}
          >
            {row.title}
            {row.isMilestone ? <span className={clsx("ml-1.5 font-mono text-[9px]", dark ? "text-muted-2" : "text-muted")}>MILESTONE</span> : null}
          </div>
          {Array.from({ length: weekCount }, (_, i) => (
            <div
              key={i}
              className={clsx(
                "h-[18px] min-w-0 rounded-[4px]",
                i === row.weekIndex
                  ? cellClasses(row.status, row.isMilestone, dark)
                  : i === todayWeek
                    ? // Light orange for the TODAY column itself, matching
                      // the reference deck's own shaded "W3" column — a
                      // separate signal from the three status colors
                      // above, not a fourth status.
                      dark
                      ? "bg-coral/15"
                      : "bg-coral-tint"
                    : dark
                      ? "bg-white/5"
                      : "bg-[#F6F5F1]"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The week-by-week bar chart from the fortnightly checkpoint deck (see
 * src/lib/timeline/gantt.ts for how it's derived from real task/phase
 * data — no separate data model, so editing a task is editing this
 * chart), grouped into three explicit bands — done, in progress, upcoming
 * — rather than relying on color alone to tell them apart. A CSS grid
 * with `1fr` week columns instead of a fixed-width scrolling row: the
 * deck's own chart fills the full page edge to edge, and a handful of
 * fixed 46px columns left most of a wide dashboard card empty instead of
 * matching that. Same dark/light split as FlightPlanSpine: dark for the
 * client portal's hero panel, light for internal Card backgrounds. */
export function GanttTimeline({ phases, tasks, goLiveTarget, dark = true }: { phases: Phase[]; tasks: Task[]; goLiveTarget: string | null; dark?: boolean }) {
  const chart = buildGanttChart(phases, tasks, { goLiveTarget });
  if (!chart || chart.rows.length === 0) return null;

  const today = new Date();
  const todayWeek = chart.weeks.findIndex((w, i) => {
    const next = chart.weeks[i + 1];
    return new Date(w.startDate) <= today && (!next || new Date(next.startDate) > today);
  });

  const rowsByGroup = new Map(STATUS_GROUP_ORDER.map((g) => [g, chart.rows.filter((r) => r.status === g)]));
  // A 0px floor let a week column shrink to nothing on a narrow screen
  // instead of ever triggering Card's own overflow-x-auto (set directly
  // on the Card wrapping this chart) -- "W1" and the TODAY sub-label
  // don't have anywhere to go once their column is a few px wide, so
  // they visually bled into their neighbours instead of being clipped.
  // A real floor makes the whole grid wider than a phone screen on
  // purpose, so it scrolls horizontally inside Card like any other wide
  // table in this app, rather than compressing into noise.
  const gridTemplate = `${LABEL_COL} repeat(${chart.weeks.length}, minmax(46px, 1fr))`;

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Eyebrow className={dark ? "text-muted-2" : "text-muted"}>TIMELINE</Eyebrow>
        <div className="flex items-center gap-3 flex-wrap">
          {STATUS_GROUP_ORDER.map((g) => (
            <span key={g} className={clsx("flex items-center gap-1.5 text-[10.5px]", dark ? "text-muted-2" : "text-muted")}>
              <span className={clsx("inline-block w-2.5 h-2.5 rounded-full", GROUP_DOT[g])} />
              {STATUS_GROUP_LABEL[g]}
            </span>
          ))}
          <span className={clsx("flex items-center gap-1.5 text-[10.5px]", dark ? "text-muted-2" : "text-muted")}>
            <span className={clsx("inline-block w-2.5 h-2.5 rounded-[3px] border-2", dark ? "border-white/50" : "border-muted")} />
            Milestone
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full">
        <div className="grid gap-[4px]" style={{ gridTemplateColumns: gridTemplate }}>
          <div />
          {chart.weeks.map((w, i) => (
            <div
              key={w.index}
              className={clsx(
                "text-center text-[10.5px] pb-1 truncate rounded-t-[4px]",
                i === todayWeek
                  ? clsx("font-semibold pt-1", dark ? "text-coral bg-coral/15" : "text-coral-strong bg-coral-tint")
                  : dark
                    ? "text-muted-2"
                    : "text-muted"
              )}
            >
              {w.label}
              {i === todayWeek ? <span className="block font-mono text-[7.5px] tracking-[.04em]">TODAY</span> : null}
            </div>
          ))}
        </div>
        {STATUS_GROUP_ORDER.map((g) => (
          <GroupSection
            key={g}
            group={g}
            rows={rowsByGroup.get(g) ?? []}
            weekCount={chart.weeks.length}
            todayWeek={todayWeek}
            gridTemplate={gridTemplate}
            dark={dark}
          />
        ))}
      </div>
    </div>
  );
}
