import { notFound } from "next/navigation";
import { Card, CardHeader, Eyebrow, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import { getProjectByRef, getClientViewConfig, getProjectBranding, getProjectShareLinks } from "@/lib/data/project";
import { getWorkspaceBranding } from "@/lib/data/branding";
import { getPortalProject } from "@/lib/data/portal";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { unpublishClientView } from "./actions";
import { ClientViewFieldToggle } from "./ClientViewFieldToggle";
import { PublishClientViewButton } from "./PublishClientViewButton";
import { LockedOffToggle } from "./LockedOffToggle";
import { CopyPortalLinkButton } from "./CopyPortalLinkButton";
import { ExpandPreviewButton } from "./ExpandPreviewButton";
import { BrandingEditor } from "./BrandingEditor";
import { ShareLinksTable } from "../share-links/ShareLinksTable";
import { createShareLink } from "../share-links/actions";

// Every section here defaults ON when a project has no explicit value yet
// (see `on` below). `gantt` is the exception, for a different reason than
// the submission cards used to be: it's a new, visually heavy section
// nobody has opted into yet, unlike phase/gate status which every
// existing project already showed before this page existed.
//
// The three submission cards (Report an issue / Change request / Ask a
// question) briefly moved to being Hypercare-only (their own report
// settings, src/app/(app)/hypercare/clients/[id]/report-config) on the
// idea that Delivery shouldn't offer them too -- reversed on direct
// request: Delivery's own portal/share link needs its own "Need
// something?" card, independently switchable from Hypercare's. Same
// fields (submissions_issue/_change_request/_question) the RPC has
// always read here regardless -- this UI is the only piece that had
// been removed.
// progress_stats/decisions/commitments/baseline_measures default off for
// the same reason gantt does, plus a second one: every row in those four
// tables also needs reviewed_at set (see 0054_checkpoint_sections.sql and
// the Checkpoint data tab) before it's in the RPC result at all, so
// turning the toggle on early just shows an empty section until the team
// has actually entered and reviewed something.
const DEFAULT_OFF_FIELDS = new Set([
  "gantt",
  "progress_stats",
  "decisions",
  "commitments",
  "baseline_measures",
  "submissions_issue",
  "submissions_change_request",
  "submissions_question",
]);

const FIELD_LABELS: Record<string, { label: string; note: string }> = {
  status: { label: "Phase and gate status", note: "Gate status only, no condition detail" },
  timeline: { label: "Timeline and phases", note: "Phase names and dates" },
  gantt: { label: "Timeline (Gantt)", note: "Week-by-week bar chart, derived from Tasks and milestones — same format as the checkpoint deck" },
  milestones: { label: "Milestones with dates", note: "Only milestones marked client visible" },
  updates: { label: "Published updates", note: "Only updates explicitly published" },
  documents: { label: "Documents marked client visible", note: "Only documents flagged client-visible" },
  roadmap: { label: "Roadmap", note: "Completed, client-flagged items — shared across every client" },
  progress_stats: { label: "Build-progress stats", note: "Migrations, rows, tests and days to cutover — reviewed rows only, from the Checkpoint data tab" },
  decisions: { label: "Decisions log", note: "Open decisions with an owner and a date — reviewed rows only" },
  commitments: { label: "This week / next week", note: "Weekly commitments from both sides — reviewed rows only" },
  baseline_measures: { label: "Baseline measures", note: "Before-and-after measures the project holds itself to — reviewed rows only" },
  submissions_issue: { label: "Report an issue card", note: "Client can send an issue — category, severity, description" },
  submissions_change_request: { label: "Change request card", note: "Client can raise a change — business impact, priority" },
  submissions_question: { label: "Ask a question card", note: "General clarification and inquiry inbox" },
};

export default async function ClientViewConfigPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const config = await getClientViewConfig(project.id);
  const fields = config?.fields ?? {};
  const branding = await getProjectBranding(project.id);
  const hostBranding = await getWorkspaceBranding(project.workspaceId);
  const viewer = await getCurrentPerson();
  const isWorkspaceAdmin = viewer?.workspace_role === "workspace_admin";
  const shareLinks = isWorkspaceAdmin ? await getProjectShareLinks(project.id) : [];

  async function createLink() {
    "use server";
    await createShareLink(project!.id, project!.ref);
  }

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

  async function unpublish() {
    "use server";
    await unpublishClientView(project!.id, project!.ref);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Choose what the client&apos;s logged-in portal and the no-login P·1 share link can show. Section toggles and
          branding below take effect immediately on the portal. Publish only freezes a snapshot for the P·1 link.
        </p>
        <div className="flex items-center gap-2 flex-none flex-wrap">
          {config?.publishedAt ? (
            <form action={unpublish} className="flex-none">
              <Button variant="secondary" type="submit">
                Unpublish
              </Button>
            </form>
          ) : null}
          <PublishClientViewButton projectId={project.id} projectRef={project.ref} />
        </div>
      </div>

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] tracking-[.09em] text-muted">SHARE THE CLIENT PORTAL — ALWAYS LIVE</span>
          <CopyPortalLinkButton projectRef={project.ref} />
        </div>
        <div className="flex items-center gap-2.5 pt-1 border-t border-line-soft">
          <Pill tone={config?.publishedAt ? "done" : "waiting_on_client"}>{config?.publishedAt ? "PUBLISHED" : "NEVER PUBLISHED"}</Pill>
          <span className="text-[11.5px] text-muted">
            {config?.publishedAt
              ? `P·1's no-login snapshot was last published ${config.publishedAt}.`
              : "P·1, the no-login share link, will show nothing until you publish for the first time."}
          </span>
        </div>
      </Card>

      {isWorkspaceAdmin ? (
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[.09em] text-muted">PUBLIC SHARE LINK (P·1) — NO LOGIN, WORKSPACE ADMIN ONLY</span>
              <span className="text-[11.5px] text-muted leading-[1.5] max-w-[66ch]">
                For a stakeholder who shouldn&apos;t have a portal account, like a board member or a site manager.
                Shows the same published snapshot as above, no login required. Every view is logged.
              </span>
            </div>
            <form action={createLink} className="flex-none">
              <Button variant="secondary" type="submit">
                Create link
              </Button>
            </form>
          </div>
          <ShareLinksTable links={shareLinks} projectRef={project.ref} />
        </Card>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-5">
          <Card className="p-4">
            <div className="mb-3">
              <span className="block text-[12.5px] font-semibold text-ink">Branding</span>
              <span className="block font-mono text-[9.5px] text-muted">LOGO, ACCENT COLOR, WELCOME HEADLINE — LEAVE BLANK FOR THE DEFAULT LOOK</span>
            </div>
            <BrandingEditor projectId={project.id} projectRef={project.ref} branding={branding} realClientName={project.clientName} />
          </Card>

          <Card>
            <CardHeader title="Sections" note="WHAT THE CLIENT SEES" />
            {Object.entries(FIELD_LABELS).map(([key, meta], i, arr) => {
              const on = DEFAULT_OFF_FIELDS.has(key) ? fields[key] === true : fields[key] !== false;
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
            <div className="flex items-center gap-2">
              <Eyebrow className="text-muted-2">/PORTAL/{project.ref.toUpperCase()}</Eyebrow>
              {preview && preview.result.state === "ok" && preview.result.project ? (
                <ExpandPreviewButton
                  result={preview.result}
                  projectRef={project.ref}
                  branding={branding}
                  hostLogoDataUrl={hostBranding.logoDataUrl}
                />
              ) : null}
            </div>
          </div>
          <div className="bg-white border border-line rounded-[12px] overflow-y-auto overflow-x-hidden max-h-[860px]">
            {preview && preview.result.state === "ok" && preview.result.project ? (
              <ClientPortalView
                result={preview.result}
                projectRef={project.ref}
                interactive={false}
                frame="embedded"
                branding={branding}
                hostLogoDataUrl={hostBranding.logoDataUrl}
              />
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
