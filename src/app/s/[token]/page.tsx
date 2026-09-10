import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getPublicShareView, type PublishedSnapshot } from "@/lib/data/public-share";
import { PublicSubmissionForm } from "@/components/portal/PublicSubmissionForm";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import type { PortalProjectResult } from "@/lib/data/portal";

/** Maps the frozen published_snapshot onto the exact shape
 * ClientPortalView already renders for the real authenticated portal
 * and for the Live Preview pane on Client View Config -- so this page
 * is never a separately hand-maintained copy of that layout again. The
 * two structural gaps a frozen snapshot genuinely can't fill:
 * - `gates`: the snapshot only freezes the single currently-held gate
 *   (already shown via the STATUS tile's note), not the full list
 *   FlightPlanSpine's own gates row would need -- omitted (its `gates`
 *   prop is optional for exactly this).
 * - `actions_required`: an inherently live, session-specific concept
 *   (marking one's own pending action done) that has no meaning for an
 *   anonymous, frozen snapshot -- empty, same as it would be for a
 *   project with nothing pending. */
function toPortalResult(snapshot: PublishedSnapshot): PortalProjectResult {
  return {
    state: "ok",
    project: snapshot.project,
    health: snapshot.health,
    progress_pct: snapshot.progress_pct,
    phases: snapshot.phases?.map((p) => ({
      id: p.code,
      code: p.code,
      name: p.name,
      index: p.index,
      started_at: p.started_at,
      completed_at: p.completed_at,
      duration_label: null,
      show_duration_label: false,
    })),
    milestones: snapshot.milestones,
    updates: snapshot.updates,
    documents: snapshot.documents,
    roadmap: snapshot.roadmap,
    gantt_tasks: snapshot.gantt_tasks,
    actions_required: [],
    progress_stats: snapshot.progress_stats,
    decisions: snapshot.decisions,
    commitments: snapshot.commitments,
    baseline_measures: snapshot.baseline_measures,
  };
}

export default async function PublicShareViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicShareView(token);

  return (
    // Full-bleed, edge to edge -- header and footer are the same width
    // as the viewport, not an inset "sheet" with margin around it.
    <div className="min-h-dvh bg-paper flex flex-col">
      {result.state === "valid" ? (
        <>
          <ClientPortalView
            result={toPortalResult(result.data)}
            projectRef=""
            interactive={false}
            frame="embedded"
            publicBadge={
              <>
                <Pill tone="idle" className="hidden sm:inline-flex">
                  SHARED VIEW · NO LOGIN REQUIRED
                </Pill>
                {result.data.project.go_live_target ? (
                  <span className="font-mono text-[9.5px] text-muted ml-2">GO LIVE {result.data.project.go_live_target}</span>
                ) : null}
              </>
            }
          />
          <NeedSomethingCard snapshot={result.data} token={token} />
          <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pb-7 sm:pb-9 text-center">
            <span className="font-mono text-[9.5px] text-muted">
              {result.published_at ? `Last updated ${new Date(result.published_at).toLocaleDateString()}` : ""}
            </span>
          </div>
        </>
      ) : (
        <>
          <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-paper/90">
            <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px]" />
            <span className="font-display font-extrabold text-[14px]">greydigi</span>
          </header>
          <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-7 sm:py-9 flex flex-col gap-5">
            {result.state === "revoked" ? (
              <StateCard
                title="Share link revoked"
                body="This link has been revoked by its owner. If you still need access, ask your greydigi contact for a new one."
              />
            ) : null}
            {result.state === "expired" ? (
              <StateCard title="Share link expired" body="This link's expiry date has passed. Ask your greydigi contact for a new one." />
            ) : null}
            {result.state === "invalid" ? (
              <StateCard title="Link not found" body="This link doesn't exist, or was never created. Check the URL and try again." />
            ) : null}
            {result.state === "error" ? (
              <StateCard title="This view isn't ready yet" body="The project this link points to hasn't been published for client viewing." />
            ) : null}
          </main>
        </>
      )}

      <footer className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 border-t border-line bg-paper/90">
        <Image src="/greydigi-logo.png" alt="" width={16} height={16} className="rounded-[4px] opacity-60" />
        <span className="font-mono text-[9px] tracking-[.03em] text-muted-2 leading-[1.5]">
          Shared by greydigi · not affiliated with your account · this link can be revoked at any time by its owner
        </span>
      </footer>
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-8 flex flex-col items-center gap-2 text-center">
      <span className="font-display font-extrabold text-[16px] text-ink">{title}</span>
      <span className="text-[11.5px] text-muted max-w-[46ch]">{body}</span>
    </Card>
  );
}

/** ClientPortalView's own "HyperCare" card is hidden here (it's gated on
 * `interactive`, which this page always passes false -- that card's
 * form is the authenticated ClientSubmissionForm, which needs a real
 * signed-in client session this page never has). This is the same card
 * in the same visual position (ClientPortalView's own HyperCare card is
 * always its last one, so this lands right after it, immediately
 * following its own </ClientPortalView>), just wired to
 * PublicSubmissionForm -- the token-based, anonymous submission path. */
function NeedSomethingCard({ snapshot, token }: { snapshot: PublishedSnapshot; token: string }) {
  const submissions = snapshot.submissions;
  const anySubmissionEnabled = submissions ? submissions.issue || submissions.change_request || submissions.question : false;
  if (!anySubmissionEnabled) return null;

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pb-5">
      <Card>
        <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
          <span className="font-display font-extrabold text-[13.5px]">Need something?</span>
          <Pill tone="idle">NO LOGIN NEEDED</Pill>
        </div>
        <div className="px-4 py-3.5 flex flex-col gap-2.5">
          <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
            Something wrong, something you want changed, or just a question — send it directly and the team is
            notified right away.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {submissions?.issue ? (
              <PublicSubmissionForm
                token={token}
                kind="issue"
                categoryOptions={snapshot.submission_options?.issue.category}
                severityOptions={snapshot.submission_options?.issue.severity}
              />
            ) : null}
            {submissions?.change_request ? (
              <PublicSubmissionForm
                token={token}
                kind="change_request"
                priorityOptions={snapshot.submission_options?.change_request.priority}
              />
            ) : null}
            {submissions?.question ? <PublicSubmissionForm token={token} kind="question" /> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
