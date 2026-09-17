import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";
import {
  getProjectByRef,
  getProjectProgressStats,
  getProjectDecisions,
  getProjectWeeklyCommitments,
  getProjectBaselineMeasures,
  getCheckpointSourceFiles,
} from "@/lib/data/project";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { createProgressStat, createDecision, createCommitment, createBaselineMeasure } from "./actions";
import { PublishCheckpointButton } from "./PublishCheckpointButton";
import { EditableStatRow } from "./EditableStatRow";
import { EditableDecisionRow } from "./EditableDecisionRow";
import { EditableCommitmentRow } from "./EditableCommitmentRow";
import { EditableMeasureRow } from "./EditableMeasureRow";
import { UploadCheckpointSourceButton } from "./UploadCheckpointSourceButton";
import { CheckpointSourceFileRow } from "./CheckpointSourceFileRow";

export default async function CheckpointDataPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [stats, decisions, commitments, measures, sourceFiles] = await Promise.all([
    getProjectProgressStats(project.id),
    getProjectDecisions(project.id),
    getProjectWeeklyCommitments(project.id),
    getProjectBaselineMeasures(project.id),
    getCheckpointSourceFiles(project.id),
  ]);
  const viewer = await getCurrentPerson();
  // Matches requireMissionsLead in auth-guard.ts -- every add/edit/
  // delete/upload/review/publish action on this page is restricted to
  // this mission's lead or a workspace admin. Everyone else with access
  // to the project still sees the page, read-only.
  const canEdit =
    viewer?.workspace_role === "workspace_admin" ||
    viewer?.workspace_role === "delivery_lead" ||
    (!!viewer && viewer.id === project.leadPersonId);

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
              href={`/missions/projects/${project.ref.toLowerCase()}/checkpoint/pdf`}
              fallbackFilename={`${project.ref}-checkpoint.pdf`}
              label="Export checkpoint PDF"
            />
            <Link
              href={`/missions/projects/${project.ref.toLowerCase()}/checkpoint/history`}
              className="font-mono text-[10px] tracking-[.04em] text-coral hover:underline whitespace-nowrap"
            >
              View history →
            </Link>
          </div>
          {canEdit ? <PublishCheckpointButton projectId={project.id} projectRef={project.ref} /> : null}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <span className="block text-[12.5px] font-semibold text-ink">Source documents</span>
            <span className="block font-mono text-[9.5px] text-muted">A DEV TEAM&apos;S OWN STATUS DECK OR SIMILAR — PDF/PNG</span>
          </div>
          {canEdit ? (
            <UploadCheckpointSourceButton projectId={project.id} projectRef={project.ref} workspaceId={project.workspaceId} />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {sourceFiles.length === 0 ? (
            <EmptyState title="No source documents yet." description="Upload the deck a checkpoint's numbers came from, for reference." />
          ) : (
            sourceFiles.map((f) => (
              <CheckpointSourceFileRow key={f.id} file={f} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />
            ))
          )}
        </div>
        <p className="m-0 mt-3 text-[10.5px] text-muted leading-[1.5]">
          &ldquo;Run auto-map&rdquo; reads a file and fills in the sections below by itself — it needs a real AI provider connected first,
          so today it explains that instead of pretending to work. Until then, read the file and type the numbers in below by hand.
        </p>
      </Card>

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
            stats.map((s) => <EditableStatRow key={s.id} stat={s} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />)
          )}
        </div>
        {canEdit ? (
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
        ) : null}
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
              <EditableDecisionRow key={d.id} decision={d} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />
            ))
          )}
        </div>
        {canEdit ? (
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
        ) : null}
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
              <EditableCommitmentRow key={c.id} commitment={c} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />
            ))
          )}
        </div>
        {canEdit ? (
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
        ) : null}
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
              <EditableMeasureRow key={m.id} measure={m} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />
            ))
          )}
        </div>
        {canEdit ? (
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
        ) : null}
      </Card>
    </div>
  );
}
