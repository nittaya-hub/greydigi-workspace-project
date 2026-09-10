import Image from "next/image";
import { Card, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { PhaseSpine, type PhaseSpineSegment } from "@/components/ui/PhaseSpine";
import { Pill } from "@/components/ui/Pill";
import { getPublicShareView } from "@/lib/data/public-share";
import { PublicSubmissionForm } from "@/components/portal/PublicSubmissionForm";
import { GanttTimeline } from "@/components/portal/GanttTimeline";

export default async function PublicShareViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicShareView(token);

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-paper/90">
        <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        <span className="flex-1" />
        {result.state === "valid" ? (
          <>
            <Pill tone="idle" className="hidden sm:inline-flex">
              SHARED VIEW · NO LOGIN REQUIRED
            </Pill>
            <span className="font-mono text-[9.5px] text-muted">
              {result.data.project.go_live_target ? `GO LIVE ${result.data.project.go_live_target}` : ""}
            </span>
          </>
        ) : null}
      </header>

      <main className="flex-1 px-4 sm:px-6 py-7 sm:py-9 max-w-[820px] w-full mx-auto flex flex-col gap-5 bg-paper">
        {result.state === "valid" ? <ValidView snapshot={result.data} publishedAt={result.published_at} token={token} /> : null}
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

      <footer className="text-center py-6">
        <span className="font-mono text-[9.5px] text-muted">
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

function ValidView({
  snapshot,
  publishedAt,
  token,
}: {
  snapshot: import("@/lib/data/public-share").PublishedSnapshot;
  publishedAt: string | null;
  token: string;
}) {
  const submissions = snapshot.submissions;
  const anySubmissionEnabled = submissions ? submissions.issue || submissions.change_request || submissions.question : false;
  const segments: PhaseSpineSegment[] | null = snapshot.phases
    ? snapshot.phases.map((p) => ({
        code: p.code,
        state: p.completed_at ? "done" : snapshot.phase?.code === p.code ? "current" : "future",
      }))
    : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <h1 className="m-0 font-display font-extrabold text-[22px] text-ink">{snapshot.project.name}</h1>
        {snapshot.project.description ? <p className="m-0 text-[12.5px] text-muted max-w-[64ch]">{snapshot.project.description}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatTile label="STATUS" value={snapshot.health.replace("_", " ")} accent={snapshot.health !== "on_plan"} />
        <StatTile label="PROGRESS" value={`${snapshot.progress_pct}%`} note={snapshot.gate ? `Held at ${snapshot.gate.code}` : undefined} />
      </div>

      {segments ? (
        <HeroPanel>
          <Eyebrow className="text-muted-2">WHERE THINGS STAND</Eyebrow>
          <span className="font-display font-extrabold text-[19px] leading-[1.2]">
            {snapshot.phase ? `${snapshot.phase.code} ${snapshot.phase.name}` : "Not started"}
          </span>
          <PhaseSpine segments={segments} dark />
        </HeroPanel>
      ) : null}

      {/* Everything from here through baseline measures mirrors the
          authenticated portal's own sections (ClientPortalView.tsx) --
          this data was always in the published snapshot
          (fn_publish_client_view already builds it, fn_public_share_view
          already returns it verbatim), it just wasn't rendered here, which
          left the no-login share link materially behind what its own
          config screen promises ("shows the same published snapshot"). */}
      {snapshot.gantt_tasks && snapshot.gantt_tasks.length > 0 && snapshot.phases ? (
        <Card className="p-4">
          <GanttTimeline
            phases={snapshot.phases.map((p) => ({ id: p.code, started_at: p.started_at }))}
            tasks={snapshot.gantt_tasks}
            goLiveTarget={snapshot.project.go_live_target}
            dark={false}
          />
        </Card>
      ) : null}

      {snapshot.progress_stats && snapshot.progress_stats.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-paper">
          {snapshot.progress_stats.map((s, i) => (
            <StatTile key={i} label={s.label} value={s.value} note={s.note ?? undefined} />
          ))}
        </div>
      ) : null}

      {snapshot.milestones && snapshot.milestones.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Milestones</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {snapshot.milestones.map((m) => (
              <div key={m.ref} className="flex justify-between text-[12.5px]">
                <span className="font-semibold text-ink">{m.title}</span>
                <span className="font-mono text-[9.5px] text-muted">{m.date ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {snapshot.updates && snapshot.updates.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Published updates</div>
          <div className="px-4 py-3.5 flex flex-col gap-3.5">
            {snapshot.updates.map((u, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-[12.5px] font-semibold text-ink">{u.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">{u.published_at?.slice(0, 10) ?? ""}</span>
                </div>
                <span className="text-[12px] text-muted leading-[1.6]">{u.body}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {snapshot.documents && snapshot.documents.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Published documents</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {snapshot.documents.map((d, i) => (
              <div key={i} className="flex justify-between text-[12.5px]">
                <span className="font-semibold text-ink">{d.name}</span>
                <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {snapshot.decisions && snapshot.decisions.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
            <span className="font-display font-extrabold text-[13.5px]">Decisions</span>
            <Eyebrow>{snapshot.decisions.filter((d) => d.status === "open").length} OPEN</Eyebrow>
          </div>
          <div className="px-4 py-3.5 flex flex-col gap-3">
            {snapshot.decisions.map((d) => (
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

      {snapshot.commitments && snapshot.commitments.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4 bg-paper">
          {snapshot.commitments.map((c, i) => (
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

      {snapshot.baseline_measures && snapshot.baseline_measures.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Measures we hold ourselves to</div>
          <div className="px-4 py-3.5 flex flex-col gap-3">
            {snapshot.baseline_measures.map((m, i) => (
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

      {anySubmissionEnabled ? (
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
            <div className="flex flex-wrap gap-1.5">
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
      ) : null}

      <div className="text-center pt-1.5">
        <span className="font-mono text-[9.5px] text-muted">
          {publishedAt ? `Last updated ${new Date(publishedAt).toLocaleDateString()}` : ""}
        </span>
      </div>
    </>
  );
}
