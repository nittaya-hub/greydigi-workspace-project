import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";
import {
  getProjectByRef,
  getProjectProgressStats,
  getProjectDecisions,
  getProjectWeeklyCommitments,
  getProjectBaselineMeasures,
} from "@/lib/data/project";
import {
  createProgressStat,
  reviewProgressStat,
  deleteProgressStat,
  createDecision,
  reviewDecision,
  toggleDecisionStatus,
  deleteDecision,
  createCommitment,
  reviewCommitment,
  deleteCommitment,
  createBaselineMeasure,
  reviewBaselineMeasure,
  deleteBaselineMeasure,
} from "./actions";
import { PublishCheckpointButton } from "./PublishCheckpointButton";

function ReviewBadge({ reviewedAt, reviewedByName }: { reviewedAt: string | null; reviewedByName: string | null }) {
  return reviewedAt ? (
    <Pill tone="done">REVIEWED{reviewedByName ? ` · ${reviewedByName.toUpperCase()}` : ""}</Pill>
  ) : (
    <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
  );
}

export default async function CheckpointDataPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [stats, decisions, commitments, measures] = await Promise.all([
    getProjectProgressStats(project.id),
    getProjectDecisions(project.id),
    getProjectWeeklyCommitments(project.id),
    getProjectBaselineMeasures(project.id),
  ]);

  async function addProgressStat(formData: FormData) {
    "use server";
    await createProgressStat(project!.id, project!.ref, formData);
  }
  async function addDecision(formData: FormData) {
    "use server";
    await createDecision(project!.id, project!.ref, formData);
  }
  async function addCommitment(formData: FormData) {
    "use server";
    await createCommitment(project!.id, project!.ref, formData);
  }
  async function addBaselineMeasure(formData: FormData) {
    "use server";
    await createBaselineMeasure(project!.id, project!.ref, formData);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[70ch]">
          Raw content for the fortnightly client checkpoint — the same numbers, decisions and commitments that go
          into the checkpoint deck. None of this is computed automatically: type in the latest figures here, then
          mark each row reviewed once someone has checked it. Only reviewed rows can ever reach the client, live or
          published — turn on the matching toggle on{" "}
          <span className="font-semibold text-ink">Client view config</span> once a section is ready to show.
        </p>
        <div className="flex flex-col items-end gap-2 flex-none">
          <div className="flex items-center gap-2">
            <ExportPdfButton
              href={`/delivery/projects/${project.ref.toLowerCase()}/checkpoint/pdf`}
              fallbackFilename={`${project.ref}-checkpoint.pdf`}
              label="Export checkpoint PDF"
            />
            <Link
              href={`/delivery/projects/${project.ref.toLowerCase()}/checkpoint/history`}
              className="font-mono text-[10px] tracking-[.04em] text-coral hover:underline whitespace-nowrap"
            >
              View history →
            </Link>
          </div>
          <PublishCheckpointButton projectId={project.id} projectRef={project.ref} />
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <span className="block text-[12.5px] font-semibold text-ink">Build-progress stats</span>
            <span className="block font-mono text-[9.5px] text-muted">MIGRATIONS, ROWS, TESTS, DAYS TO CUTOVER</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {stats.length === 0 ? (
            <EmptyState title="No stats yet." description="Add the numbers from this checkpoint's engineering update." />
          ) : (
            stats.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5 border border-line-soft rounded-[9px]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-extrabold text-[16px] text-ink">{s.value}</span>
                    <span className="text-[11.5px] font-semibold text-ink">{s.label}</span>
                  </div>
                  {s.note ? <span className="block text-[11px] text-muted mt-0.5">{s.note}</span> : null}
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <ReviewBadge reviewedAt={s.reviewedAt} reviewedByName={s.reviewedByName} />
                  {!s.reviewedAt ? (
                    <form action={reviewProgressStat.bind(null, s.id, project.id, project.ref)}>
                      <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                        Mark reviewed
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteProgressStat.bind(null, s.id, project.id, project.ref)}>
                    <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
        <form action={addProgressStat} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-end">
          <Field label="LABEL">
            <input name="label" required className={fieldInputClass} placeholder="Migrations done" />
          </Field>
          <Field label="VALUE">
            <input name="value" required className={fieldInputClass} placeholder="5 of 9" />
          </Field>
          <Field label="NOTE (OPTIONAL)">
            <input name="note" className={fieldInputClass} placeholder="M1, M3, M3a, M3-seed, M4 on production." />
          </Field>
          <Button variant="primary" type="submit" className="flex-none">
            Add
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <span className="block text-[12.5px] font-semibold text-ink">Decisions log</span>
          <span className="block font-mono text-[9.5px] text-muted">OPEN ITEMS WAITING ON AN OWNER AND A DATE</span>
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {decisions.length === 0 ? (
            <EmptyState title="No decisions logged." description="Add what's still open, who owns it, and by when." />
          ) : (
            decisions.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 px-3 py-2.5 border border-line-soft rounded-[9px]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">{d.title}</span>
                    <Pill tone={d.status === "closed" ? "done" : "idle"}>{d.status.toUpperCase()}</Pill>
                  </div>
                  {d.detail ? <span className="block text-[11px] text-muted mt-0.5">{d.detail}</span> : null}
                  <span className="block font-mono text-[9.5px] text-muted-2 mt-1">
                    {d.owner ? d.owner.toUpperCase() : "NO OWNER"} · {d.dueLabel ?? "no date"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end">
                  <ReviewBadge reviewedAt={d.reviewedAt} reviewedByName={d.reviewedByName} />
                  {!d.reviewedAt ? (
                    <form action={reviewDecision.bind(null, d.id, project.id, project.ref)}>
                      <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                        Mark reviewed
                      </Button>
                    </form>
                  ) : null}
                  <form
                    action={toggleDecisionStatus.bind(null, d.id, project.id, project.ref, d.status === "closed" ? "open" : "closed")}
                  >
                    <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                      {d.status === "closed" ? "Reopen" : "Close"}
                    </Button>
                  </form>
                  <form action={deleteDecision.bind(null, d.id, project.id, project.ref)}>
                    <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
        <form action={addDecision} className="grid grid-cols-2 gap-2">
          <Field label="TITLE">
            <input name="title" required className={fieldInputClass} placeholder="Continuity cover on the schema" />
          </Field>
          <Field label="OWNER">
            <input name="owner" className={fieldInputClass} placeholder="L.T." />
          </Field>
          <Field label="WHY IT MATTERS (OPTIONAL)">
            <input name="detail" className={fieldInputClass} placeholder="A second name alongside Tony." />
          </Field>
          <Field label="DUE (OPTIONAL)">
            <input name="due_label" className={fieldInputClass} placeholder="W4" />
          </Field>
          <Button variant="primary" type="submit" className="col-span-2 flex-none justify-self-start">
            Add decision
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <span className="block text-[12.5px] font-semibold text-ink">This week / next week</span>
          <span className="block font-mono text-[9.5px] text-muted">COMMITMENTS FROM BOTH SIDES</span>
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {commitments.length === 0 ? (
            <EmptyState title="No commitments yet." description="Add this week's and next week's plan, and what the client committed to." />
          ) : (
            commitments.map((c) => (
              <div
                key={c.id}
                className={`flex items-start justify-between gap-3 px-3 py-2.5 border rounded-[9px] ${
                  c.accent ? "border-coral" : "border-line-soft"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">{c.periodLabel}</span>
                    <span className="font-mono text-[9px] text-muted-2">{c.ownerLabel.toUpperCase()}</span>
                  </div>
                  <ul className="m-0 mt-1 pl-4 flex flex-col gap-0.5">
                    {c.items.map((item, i) => (
                      <li key={i} className="text-[11.5px] text-muted leading-[1.5]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <ReviewBadge reviewedAt={c.reviewedAt} reviewedByName={c.reviewedByName} />
                  {!c.reviewedAt ? (
                    <form action={reviewCommitment.bind(null, c.id, project.id, project.ref)}>
                      <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                        Mark reviewed
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteCommitment.bind(null, c.id, project.id, project.ref)}>
                    <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
        <form action={addCommitment} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="PERIOD">
              <input name="period_label" required className={fieldInputClass} placeholder="This week, 7 to 11 September" />
            </Field>
            <Field label="OWNER">
              <input name="owner_label" required className={fieldInputClass} placeholder="greydigi" />
            </Field>
          </div>
          <Field label="ITEMS (ONE PER LINE)">
            <textarea
              name="items"
              rows={3}
              className={fieldInputClass}
              placeholder={"M6, order intake mapped.\nM5, purchasing and planning spec."}
            />
          </Field>
          <label className="flex items-center gap-2 text-[11.5px] text-muted">
            <input type="checkbox" name="accent" />
            Highlight this card (e.g. commitments from the client)
          </label>
          <Button variant="primary" type="submit" className="flex-none justify-self-start">
            Add commitment card
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <span className="block text-[12.5px] font-semibold text-ink">Baseline measures</span>
          <span className="block font-mono text-[9.5px] text-muted">BEFORE / AFTER, THE MEASURES THIS PROJECT HOLDS ITSELF TO</span>
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {measures.length === 0 ? (
            <EmptyState title="No measures yet." description="Add what changes, comparing today against after this phase." />
          ) : (
            measures.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5 border border-line-soft rounded-[9px]">
                <div className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-ink">{m.measureName}</span>
                  <span className="block text-[11px] text-muted mt-0.5">
                    Today: {m.todayValue} → After: {m.afterValue}
                  </span>
                  {m.baselinedWhen ? (
                    <span className="block font-mono text-[9.5px] text-muted-2 mt-1">BASELINED {m.baselinedWhen.toUpperCase()}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <ReviewBadge reviewedAt={m.reviewedAt} reviewedByName={m.reviewedByName} />
                  {!m.reviewedAt ? (
                    <form action={reviewBaselineMeasure.bind(null, m.id, project.id, project.ref)}>
                      <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                        Mark reviewed
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteBaselineMeasure.bind(null, m.id, project.id, project.ref)}>
                    <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
        <form action={addBaselineMeasure} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-2 items-end">
          <Field label="MEASURE">
            <input name="measure_name" required className={fieldInputClass} placeholder="Hands-on time, order receipt to approved PO" />
          </Field>
          <Field label="TODAY">
            <input name="today_value" required className={fieldInputClass} placeholder="Six to eight hours by hand" />
          </Field>
          <Field label="AFTER">
            <input name="after_value" required className={fieldInputClass} placeholder="Under one hour" />
          </Field>
          <Field label="BASELINED WHEN (OPTIONAL)">
            <input name="baselined_when" className={fieldInputClass} placeholder="W7 and W8 parallel weeks" />
          </Field>
          <Button variant="primary" type="submit" className="flex-none">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
