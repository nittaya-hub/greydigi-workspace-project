import Image from "next/image";
import { Card, StatTile, HeroPanel, Eyebrow, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { PortalProjectResult } from "@/lib/data/portal";
import { ActionItem } from "@/app/portal/[ref]/ActionItem";
import { ClientSubmissionForm } from "@/app/portal/[ref]/ClientSubmissionForm";
import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";

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
}) {
  const project = result.project;
  if (!project) return null;

  const pendingActions = (result.actions_required ?? []).filter((a) => a.status === "pending" || a.status === "in_progress");
  const hasAnyContent =
    (result.phases?.length ?? 0) > 0 ||
    (result.milestones?.length ?? 0) > 0 ||
    (result.updates?.length ?? 0) > 0 ||
    (result.documents?.length ?? 0) > 0;

  return (
    <div className={`${frame === "page" ? "min-h-dvh" : ""} bg-paper flex flex-col ${className ?? ""}`}>
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white">
        <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        <span className="w-px h-[18px] bg-line" />
        <span className="text-[12.5px] text-muted">{project.client_name}</span>
        <span className="flex-1" />
      </header>

      <main className="flex-1 px-4 sm:px-6 py-7 sm:py-9 max-w-[1100px] w-full mx-auto flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
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
            <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 items-stretch">
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
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
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
                    <ClientSubmissionForm projectRef={projectRef} kind="issue" />
                    <ClientSubmissionForm projectRef={projectRef} kind="change_request" />
                    <ClientSubmissionForm projectRef={projectRef} kind="question" />
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
