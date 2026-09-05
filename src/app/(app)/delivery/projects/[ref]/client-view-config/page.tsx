import { notFound } from "next/navigation";
import { Card, CardHeader, Eyebrow, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import { getProjectByRef, getClientViewConfig } from "@/lib/data/project";
import { getPortalProject } from "@/lib/data/portal";
import { publishClientView, unpublishClientView } from "./actions";
import { ClientViewFieldToggle } from "./ClientViewFieldToggle";
import { LockedOffToggle } from "./LockedOffToggle";
import { CopyPortalLinkButton } from "./CopyPortalLinkButton";

const FIELD_LABELS: Record<string, { label: string; note: string }> = {
  status: { label: "Phase and gate status", note: "Gate status only, no condition detail" },
  timeline: { label: "Timeline and phases", note: "Phase names and dates" },
  milestones: { label: "Milestones with dates", note: "Only milestones marked client visible" },
  updates: { label: "Published updates", note: "Only updates explicitly published" },
  documents: { label: "Documents marked client visible", note: "Only documents flagged client-visible" },
};

export default async function ClientViewConfigPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const config = await getClientViewConfig(project.id);
  const fields = config?.fields ?? {};

  // Live draft preview — reads through the exact same fn_client_portal_project
  // RPC the real /portal/[ref] page calls (see src/lib/data/portal.ts), just
  // invoked as the signed-in internal admin instead of the client. Internal
  // RLS policies (project_phases_internal, client_actions_internal, etc. in
  // 0007_rls.sql) allow that read. Because this function already gates every
  // section by the current (draft) client_view_configs.fields row, the
  // preview reflects the draft, not the last-published snapshot — and every
  // toggle click already revalidates this exact route, so the preview
  // updates on the same round trip that persists the toggle.
  const preview = await getPortalProject(project.ref);

  async function publish() {
    "use server";
    await publishClientView(project!.id, project!.ref);
  }

  async function unpublish() {
    "use server";
    await unpublishClientView(project!.id, project!.ref);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Choose what the portal and public share links can show. Changes take effect on publish, never live.
        </p>
        <div className="flex items-center gap-2 flex-none flex-wrap">
          {config?.publishedAt ? (
            <form action={unpublish} className="flex-none">
              <Button variant="secondary" type="submit">
                Unpublish
              </Button>
            </form>
          ) : null}
          <form action={publish} className="flex-none">
            <Button variant="coral" type="submit">
              Publish
            </Button>
          </form>
        </div>
      </div>

      {config?.publishedAt ? (
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Pill tone="done">PUBLISHED</Pill>
            <span className="text-[11.5px] text-muted">Last published {config.publishedAt}.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.09em] text-muted">SHARE THIS PORTAL</span>
            <CopyPortalLinkButton projectRef={project.ref} />
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-coral-tint border-coral flex items-center gap-2.5">
          <Pill tone="waiting_on_client">NEVER PUBLISHED</Pill>
          <span className="text-[11.5px] text-coral-strong">
            P·1 and the client portal will show nothing until this project is published for the first time.
          </span>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Sections" note="WHAT THE CLIENT SEES" />
            {Object.entries(FIELD_LABELS).map(([key, meta], i, arr) => {
              const on = fields[key] !== false;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${
                    i < arr.length - 1 ? "border-b border-line-soft" : ""
                  }`}
                >
                  <span className="flex-1">
                    <span className="block text-[12.5px] font-semibold text-ink">{meta.label}</span>
                    <span className="block font-mono text-[9.5px] text-muted">{meta.note}</span>
                  </span>
                  <ClientViewFieldToggle projectId={project.id} projectRef={project.ref} fieldKey={key} initialOn={on} />
                </div>
              );
            })}
            <div className="flex items-center gap-2.5 px-4 py-[11px] text-[12px] border-t border-line-soft">
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold text-ink">Internal effort and rates</span>
                <span className="block font-mono text-[9.5px] text-muted">Never crosses the publication boundary</span>
              </span>
              <LockedOffToggle label="Internal effort and rates (always off)" />
            </div>
            <div className="flex items-center gap-2.5 px-4 py-[11px] text-[12px] border-t border-line-soft">
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold text-ink">Task-level detail</span>
                <span className="block font-mono text-[9.5px] text-muted">Too granular for a client-facing view</span>
              </span>
              <LockedOffToggle label="Task-level detail (always off)" />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>LIVE PREVIEW, DRAFT STATE</Eyebrow>
            <Eyebrow className="text-muted-2">/PORTAL/{project.ref.toUpperCase()}</Eyebrow>
          </div>
          <div className="bg-white border border-line rounded-[12px] overflow-y-auto overflow-x-hidden max-h-[860px]">
            {preview && preview.result.state === "ok" && preview.result.project ? (
              <ClientPortalView result={preview.result} projectRef={project.ref} interactive={false} frame="embedded" />
            ) : (
              <EmptyState
                title="Preview unavailable."
                description="Couldn't load a live preview of the client portal for this project."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
