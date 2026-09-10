import Image from "next/image";
import { Card, StatTile, HeroPanel, Eyebrow, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { PortalProjectResult } from "@/lib/data/portal";
import type { ProjectBranding } from "@/lib/data/project";
import { ActionItem } from "@/app/portal/[ref]/ActionItem";
import { ClientSubmissionForm } from "@/app/portal/[ref]/ClientSubmissionForm";
import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";
import { GanttTimeline } from "@/components/portal/GanttTimeline";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";
import type { SubmissionTaxonomyField } from "@/lib/data/submission-taxonomies";

type SubmissionOptionsByKind = Record<
  ClientSubmissionKind,
  Record<SubmissionTaxonomyField, { value: string; label: string }[]> | null
>;

/** The one size box both the host logo and the client logo render into
 * -- object-contain (not object-cover) so a non-square logo shows whole
 * instead of getting cropped, and identical between the two marks so
 * neither ever reads as "the more important one" just because its own
 * source image happens to be bigger. Shrinks on phone-width screens so
 * the header has room for a client name next to it without wrapping. */
const LOGO_CLASS = "h-[18px] sm:h-[22px] w-auto max-w-[72px] sm:max-w-[84px] object-contain rounded-[4px] flex-none";

/**
 * The visual body of the external client portal (`/portal/[ref]`), pulled
 * out so it can be rendered from two places off the exact same markup:
 * the real portal page (server-rendered, reads live via
 * fn_client_portal_project) and the Client View Config live preview pane
 * (also live, but reads as the signed-in internal admin previewing the
 * draft — same shape of data, just a different caller). Never fork this
 * markup — both callers must stay pixel-identical or the preview stops
 * meaning anything.
 */
export function ClientPortalView({
  result,
  projectRef,
  interactive = true,
  frame = "page",
  className,
  hypercareEnabled = false,
  submissionOptions,
  branding,
  hostLogoDataUrl,
}: {
  result: PortalProjectResult;
  projectRef: string;
  /** false in the Client View Config preview pane: renders "what we need
   * from you" as a static list instead of wiring up ActionItem's mark-done
   * button, since that mutates real client_actions rows and should only
   * ever be triggered by the actual client, never an admin previewing.
   * Also gates the HyperCare submission forms — an admin previewing a
   * draft config should never see live "Report an issue" etc. CTAs. */
  interactive?: boolean;
  /** "page" (default) fills the viewport (min-h-dvh) — the real portal
   * route. "embedded" drops that so the sandbox preview pane on Client
   * View Config can size and scroll it inside a bounded card instead of
   * forcing full-viewport height inside the admin shell. */
  frame?: "page" | "embedded";
  className?: string;
  /** Per-client admin gate (clients.hypercare_enabled) — default false so
   * the preview pane (which doesn't pass this) never shows HyperCare CTAs
   * either. */
  hypercareEnabled?: boolean;
  /** Category/severity/priority options per submission kind, from Settings
   * → Submission types. Undefined/null in the Client View Config preview
   * (never rendered there — HyperCare is gated on `interactive` below). */
  submissionOptions?: SubmissionOptionsByKind;
  /** This project's own logo/accent color/welcome headline override
   * (src/lib/data/project.ts::getProjectBranding). Undefined/all-null
   * (the common case) renders exactly as before — this never changes
   * the app's own default look, only an explicit per-project choice. */
  branding?: ProjectBranding;
  /** Workspace-level logo override from Settings → Branding
   * (src/lib/data/branding.ts::getWorkspaceBranding) — greydigi's own
   * mark, separate from a project's client branding below. Used only if
   * the workspace has actually uploaded one; otherwise the default
   * /greydigi-logo.png. This identity never disappears just because a
   * project has its own client logo — the two sit side by side. */
  hostLogoDataUrl?: string | null;
}) {
  const project = result.project;
  if (!project) return null;

  const accentColor = branding?.accentColor || undefined;
  const clientDisplayName = branding?.clientDisplayName || project.client_name;
  const showClientName = branding?.showClientName ?? true;
  const showClientLogoOrName = Boolean(branding?.logoDataUrl) || showClientName;

  const pendingActions = (result.actions_required ?? []).filter((a) => a.status === "pending" || a.status === "in_progress");
  const hasAnyContent =
    (result.phases?.length ?? 0) > 0 ||
    (result.milestones?.length ?? 0) > 0 ||
    (result.updates?.length ?? 0) > 0 ||
    (result.documents?.length ?? 0) > 0 ||
    (result.roadmap?.length ?? 0) > 0 ||
    (result.gantt_tasks?.length ?? 0) > 0 ||
    (result.progress_stats?.length ?? 0) > 0 ||
    (result.decisions?.length ?? 0) > 0 ||
    (result.commitments?.length ?? 0) > 0 ||
    (result.baseline_measures?.length ?? 0) > 0;

  return (
    // Accent override is scoped to this element via a CSS custom
    // property — text-coral/bg-coral etc. everywhere inside inherit it
    // (globals.css defines --color-coral under @theme inline, so any
    // ancestor can override the value the whole cascade reads) — and it
    // never touches globals.css's own :root, so the internal app's own
    // chrome is never affected by a client's branding choice.
    <div
      style={accentColor ? ({ "--color-coral": accentColor } as React.CSSProperties) : undefined}
      className={`${frame === "page" ? "min-h-dvh" : ""} bg-paper flex flex-col ${className ?? ""}`}
    >
      {/* bg-paper/90, not bg-white -- matches the internal app's own
          Header.tsx, which sits on the same cream page background this
          way rather than as a contrasting white strip. The header and
          the page below it are the same surface, just separated by a
          hairline border, not two different background colors. */}
      <header className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-line bg-paper/90 flex-wrap">
        {/* Host identity — greydigi's own mark, from Settings → Branding
            if the workspace uploaded one, else the default. A project's
            own client branding below never replaces this; the two marks
            sit side by side, which is the whole point of co-branding.
            Same h-[22px]/max-w-[84px]/object-contain box as the client
            logo right below it -- HOST_LOGO_CLASS is the one source for
            both, so the two marks always render at the exact same size
            no matter each image's own aspect ratio. Shrinks slightly on
            phone-width screens (h-[18px]) so a long client name doesn't
            force this row onto three lines. */}
        {hostLogoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hostLogoDataUrl} alt="greydigi" className={LOGO_CLASS} />
        ) : (
          <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px] h-[18px] sm:h-[22px] w-auto" />
        )}
        <span className="font-display font-extrabold text-[13px] sm:text-[14px] whitespace-nowrap">greydigi</span>
        {branding?.logoDataUrl || showClientLogoOrName ? <span className="w-px h-[16px] sm:h-[18px] bg-line" /> : null}
        {/* Client identity — this project's own branding. Both the logo
            and the name are now independently controllable (Client view
            config → Branding): the logo shows whenever uploaded, the name
            shows unless the admin turned it off (showClientName), and an
            edited display name always wins over the client's raw record
            name. min-w-0 + truncate keeps a long name from pushing the
            layout wide on narrow screens instead of just clipping. */}
        {branding?.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoDataUrl} alt="" className={LOGO_CLASS} />
        ) : null}
        {showClientName ? <span className="text-[12px] sm:text-[12.5px] text-muted min-w-0 truncate">{clientDisplayName}</span> : null}
        <span className="flex-1" />
      </header>

      {/* @container: the two grids below key their column count off this
          element's own rendered width, not the browser viewport. The real
          portal route renders this at up to 1100px wide, so they still
          open into 2-3 columns as before; the Client View Config preview
          renders the same markup in a box roughly half that wide, so they
          now correctly stay single-column instead of cramming a
          full-width layout into a narrow box (the preview used to inherit
          viewport-sized sm:/lg: breakpoints regardless of its own width). */}
      {/* bg-paper again here, not just on the outer wrapper -- this is
          the element that actually holds every card on the page (Timeline,
          Decisions, Measures, ...), so it carries its own opaque
          background rather than relying on the ancestor div's paint to
          show through every descendant box. Costs nothing when it's
          already the same color; removes any chance of body's own
          --color-canvas (globals.css, the app-wide default background)
          reading through as a second, greyer tone partway down a long
          page like this one. */}
      <main className="@container flex-1 px-4 sm:px-6 py-7 sm:py-9 max-w-[1100px] w-full mx-auto flex flex-col gap-5 bg-paper">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          {branding?.welcomeHeadline ? (
            <p className="m-0 text-[13px] font-semibold text-coral">{branding.welcomeHeadline}</p>
          ) : null}
          <h1 className="m-0 font-display font-extrabold text-[23px] text-ink">{project.name}</h1>
          {project.description ? <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">{project.description}</p> : null}
        </div>

        {!hasAnyContent ? (
          <Card>
            <EmptyState
              title="Nothing to show yet."
              description="Your project has just been opened. Once the mission brief is agreed you will see progress, dates and anything we need from you here."
            />
          </Card>
        ) : (
          <>
            {/* Full width, same as the Timeline section below it — the
                flight plan row needs the whole page's worth of space to
                lay out all 7 phases (and 5 gates) on one line. Sharing
                a row with "What we need from you" was what forced it
                into a narrower column and cut phases off. */}
            <HeroPanel>
              <Eyebrow className="text-muted-2">WHERE WE ARE</Eyebrow>
              <span className="font-display font-extrabold text-[21px] leading-[1.2]">
                {pendingActions.length > 0
                  ? `Waiting on ${pendingActions.length} item${pendingActions.length === 1 ? "" : "s"} from you`
                  : (result.health ?? "on_plan").replace("_", " ")}
              </span>
              {result.phases && result.phases.length > 0 ? (
                <FlightPlanSpine phases={result.phases} gates={result.gates} />
              ) : null}
              <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-white/10">
                <span className="flex flex-col gap-1">
                  <Eyebrow className="text-muted-2">GO LIVE</Eyebrow>
                  <span className="text-[13px] font-semibold">{project.go_live_target ?? "—"}</span>
                </span>
                <span className="flex flex-col gap-1">
                  <Eyebrow className="text-muted-2">PROGRESS</Eyebrow>
                  <span className="text-[13px] font-semibold">{result.progress_pct ?? 0}%</span>
                </span>
              </div>
            </HeroPanel>

            {pendingActions.length > 0 ? (
              <Card className="border-coral">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-coral">
                  <span className="font-display font-extrabold text-[13.5px]">What we need from you</span>
                  <Pill tone="waiting_on_client">{pendingActions.length} ITEM{pendingActions.length === 1 ? "" : "S"}</Pill>
                </div>
                <div className="px-4 py-3.5 flex flex-col gap-3.5">
                  {pendingActions.map((a, i) => (
                    <div key={a.id} className={i > 0 ? "pt-3.5 border-t border-line-soft" : undefined}>
                      {interactive ? (
                        <ActionItem id={a.id} title={a.title} description={a.description} dueAt={a.due_at} projectRef={projectRef} />
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[12.5px] font-semibold text-ink">{a.title}</span>
                          {a.description ? <span className="text-[11.5px] text-muted leading-[1.5]">{a.description}</span> : null}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {a.due_at ? (
                              <span className="font-mono text-[9.5px] text-block-fg">REQUESTED {new Date(a.due_at).toLocaleDateString()}</span>
                            ) : (
                              <span />
                            )}
                            <Pill tone="idle">PREVIEW ONLY</Pill>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <StatTile label="ACTIONS REQUIRED" value={0} note="Nothing waiting on you right now" />
            )}

            {result.gantt_tasks && result.gantt_tasks.length > 0 && result.phases ? (
              <Card className="p-4">
                <GanttTimeline phases={result.phases} tasks={result.gantt_tasks} goLiveTarget={project.go_live_target} dark={false} />
              </Card>
            ) : null}

            {result.progress_stats && result.progress_stats.length > 0 ? (
              <div className="grid grid-cols-2 @lg:grid-cols-4 gap-3 bg-paper">
                {result.progress_stats.map((s, i) => (
                  <StatTile key={i} label={s.label} value={s.value} note={s.note ?? undefined} />
                ))}
              </div>
            ) : null}

            {result.decisions && result.decisions.length > 0 ? (
              <Card>
                <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
                  <span className="font-display font-extrabold text-[13.5px]">Decisions</span>
                  <Eyebrow>{result.decisions.filter((d) => d.status === "open").length} OPEN</Eyebrow>
                </div>
                <div className="px-4 py-3.5 flex flex-col gap-3">
                  {result.decisions.map((d) => (
                    <div key={d.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-ink">{d.title}</span>
                        <Pill tone={d.status === "closed" ? "done" : "waiting_on_client"}>{d.status.toUpperCase()}</Pill>
                      </div>
                      {d.detail ? <span className="text-[11.5px] text-muted leading-[1.5]">{d.detail}</span> : null}
                      <span className="font-mono text-[9.5px] text-muted-2">
                        {(d.owner ?? "—").toUpperCase()} · {d.due_label ?? "no date"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {result.commitments && result.commitments.length > 0 ? (
              <div className="grid @lg:grid-cols-3 gap-4 bg-paper">
                {result.commitments.map((c, i) => (
                  <Card key={i} className={c.accent ? "border-coral" : undefined}>
                    <div className="px-4 py-3.5 border-b border-line-soft flex items-center justify-between gap-2">
                      <span className="font-display font-extrabold text-[13px]">{c.period_label}</span>
                      <Eyebrow className="text-muted-2">{c.owner_label}</Eyebrow>
                    </div>
                    <ul className="m-0 px-4 py-3.5 flex flex-col gap-2 list-disc pl-8">
                      {c.items.map((item, j) => (
                        <li key={j} className="text-[11.5px] text-ink leading-[1.5]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            ) : null}

            {result.baseline_measures && result.baseline_measures.length > 0 ? (
              <Card>
                <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Measures we hold ourselves to</div>
                <div className="px-4 py-3.5 flex flex-col gap-3">
                  {result.baseline_measures.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-ink">{m.measure_name}</span>
                      <span className="text-[11.5px] text-muted text-right">
                        {m.today_value} <span className="text-muted-2">→</span> {m.after_value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <div className="grid @lg:grid-cols-3 gap-4 bg-paper">
              {result.milestones && result.milestones.length > 0 ? (
                <Card>
                  <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Dates</div>
                  <div className="px-4 py-3.5 flex flex-col gap-3">
                    {result.milestones.map((m) => (
                      <div key={m.ref} className="flex justify-between">
                        <span className="text-[12.5px] font-semibold text-ink">{m.title}</span>
                        <span className="font-mono text-[9.5px] text-muted">{m.date ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              {result.documents && result.documents.length > 0 ? (
                <Card>
                  <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Documents</div>
                  <div className="px-4 py-3.5 flex flex-col gap-3">
                    {result.documents.map((d, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-[12.5px] font-semibold text-ink">{d.name}</span>
                        <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              {result.updates && result.updates.length > 0 ? (
                <Card>
                  <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
                    <span className="font-display font-extrabold text-[13.5px]">Latest update</span>
                    <Eyebrow>{result.updates[0].published_at?.slice(0, 10)}</Eyebrow>
                  </div>
                  <div className="px-4 py-3.5">
                    <span className="text-[12px] text-ink leading-[1.6]">{result.updates[0].body}</span>
                  </div>
                </Card>
              ) : null}
            </div>

            {result.roadmap && result.roadmap.length > 0 ? (
              <Card>
                <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
                  <span className="font-display font-extrabold text-[13.5px]">Roadmap</span>
                  <Eyebrow>SHIPPED FOR YOU</Eyebrow>
                </div>
                <div className="px-4 py-3.5 flex flex-col gap-3">
                  {result.roadmap.map((r) => (
                    <div key={r.ref} className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-ink">{r.title}</span>
                      <span className="flex items-center gap-2 flex-none">
                        {r.quarter ? <span className="font-mono text-[9.5px] text-muted">{r.quarter}</span> : null}
                        <Pill tone="done">{r.kind.toUpperCase()}</Pill>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {interactive && hypercareEnabled ? (
              <Card>
                <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
                  <span className="font-display font-extrabold text-[13.5px]">HyperCare</span>
                  <Eyebrow>SUPPORT AFTER GO-LIVE</Eyebrow>
                </div>
                <div className="px-4 py-3.5 flex flex-col gap-2.5">
                  <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
                    Something wrong, something you want changed, or just a question — tell us directly and the team
                    is notified right away.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {submissionOptions?.issue ? (
                      <ClientSubmissionForm projectRef={projectRef} kind="issue" options={submissionOptions.issue} />
                    ) : null}
                    {submissionOptions?.change_request ? (
                      <ClientSubmissionForm
                        projectRef={projectRef}
                        kind="change_request"
                        options={submissionOptions.change_request}
                      />
                    ) : null}
                    {submissionOptions?.question ? (
                      <ClientSubmissionForm projectRef={projectRef} kind="question" options={submissionOptions.question} />
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
