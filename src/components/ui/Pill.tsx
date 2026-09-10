import { type ReactNode } from "react";
import clsx from "clsx";

/**
 * The seven status pill tones from the design source's component
 * inventory (SHELL section, "STATUS PILLS"). Every screen that shows a
 * status badge — task, gate, project health, incident, CR — picks one of
 * these, never an ad hoc color.
 */
export type PillTone =
  | "done"
  | "in_progress"
  | "waiting_on_client"
  | "blocked"
  | "watch"
  | "idle"
  | "ghost"
  | "coral_outline"
  | "dark";

const TONE_CLASSES: Record<PillTone, string> = {
  done: "bg-ok-bg text-ok-fg",
  in_progress: "bg-neutral-bg text-ink",
  waiting_on_client: "bg-coral-tint text-coral-strong",
  blocked: "bg-block-bg text-block-fg",
  watch: "bg-warn-bg text-warn-fg",
  idle: "bg-idle-bg text-muted",
  ghost: "bg-transparent text-muted-2 border border-line",
  coral_outline: "bg-transparent text-coral border border-line",
  dark: "bg-ink text-white",
};

export function Pill({
  tone = "idle",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-[5px] px-[7px] py-[3px] font-mono text-[9px] tracking-[.06em] justify-self-start",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const HEALTH_TONE: Record<string, PillTone> = {
  on_plan: "in_progress",
  watch: "watch",
  blocked: "blocked",
};

const HEALTH_LABEL: Record<string, string> = {
  on_plan: "ON PLAN",
  watch: "WATCH",
  blocked: "BLOCKED",
};

/** Renders a project/service health value the state engine returned. Never
 * accepts a hand-typed label — the caller passes the enum, this maps it. */
export function HealthPill({ health, className }: { health: string; className?: string }) {
  return (
    <Pill tone={HEALTH_TONE[health] ?? "idle"} className={className}>
      {HEALTH_LABEL[health] ?? health.toUpperCase()}
    </Pill>
  );
}

const GATE_TONE: Record<string, PillTone> = {
  cleared: "done",
  held: "blocked",
  on_plan: "in_progress",
};

const GATE_LABEL: Record<string, string> = {
  cleared: "CLEARED",
  held: "BLOCKED",
  on_plan: "ON PLAN",
};

export function GateStatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Pill tone={GATE_TONE[status] ?? "idle"} className={className}>
      {GATE_LABEL[status] ?? status.toUpperCase()}
    </Pill>
  );
}

// Task status gets its own dedicated palette instead of routing through
// the shared Pill tones above — those tone *names* (in_progress,
// waiting_on_client, blocked...) are reused all over the app for
// unrelated meanings (document visibility, publish state, brand tags),
// so recoloring them to match the reference deck's task legend — green
// done, orange in progress, grey not started, red waiting on client —
// would have repainted two dozen unrelated badges along with it. Mirrors
// TaskPhaseGroup.tsx's STATUS_SELECT_CLASSES, which needs the same
// colors for the inline status select's own badge look.
const TASK_STATUS_CLASSES: Record<string, string> = {
  done: "bg-ok-bg text-ok-fg",
  in_progress: "bg-coral-tint text-coral-strong",
  waiting_on_client: "bg-block-bg text-block-fg",
  blocked: "bg-block-bg text-block-fg",
  watch: "bg-warn-bg text-warn-fg",
  idle: "bg-idle-bg text-muted",
};

export function TaskStatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-[5px] px-[7px] py-[3px] font-mono text-[9px] tracking-[.06em] justify-self-start",
        TASK_STATUS_CLASSES[status] ?? TASK_STATUS_CLASSES.idle,
        className
      )}
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}
