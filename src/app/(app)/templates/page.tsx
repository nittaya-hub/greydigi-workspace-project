import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { listTemplates } from "@/lib/data/templates";
import { NewTemplateButton } from "./NewTemplateButton";
import { TemplateLockToggle } from "./TemplateLockToggle";
import { DeleteTemplateButton } from "./DeleteTemplateButton";

const COLS = "1fr 62px 68px 110px 32px";

export default async function TemplatesPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Templates" />;

  const workspaceId = await getCurrentWorkspaceId();
  const templates = workspaceId ? await listTemplates(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Templates" description="A template defines phases, gates and the conditions each gate enforces. Projects inherit a versioned copy." />
        <NewTemplateButton />
      </div>

      <Card>
        {templates.length === 0 ? (
          <EmptyState
            title="No templates yet."
            description="Without a template a project has no gates, which means no enforcement. Start from the greydigi standard and adapt."
            action={<NewTemplateButton label="Import greydigi standard" defaultName="Automation delivery, standard" />}
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>TEMPLATE</span>
              <span>VER</span>
              <span>USED BY</span>
              <span>STATUS</span>
              <span />
            </TableHead>
            {templates.map((t, i) => (
              <TableRow cols={COLS} key={t.id} last={i === templates.length - 1}>
                <Link href={`/templates/${t.id}`}>
                  <CellStack primary={t.name} secondary={`${t.phaseCount} PHASES, ${t.gateCount} GATES, ${t.conditionCount} CONDITIONS`} />
                </Link>
                <span className="font-mono text-[9.5px] text-muted">{t.version}</span>
                <span className="font-mono text-[9.5px] text-muted">{t.usedByCount}</span>
                <TemplateLockToggle versionId={t.id} initialLocked={t.isLocked} />
                <DeleteTemplateButton versionId={t.id} name={t.name} version={t.version} usedByCount={t.usedByCount} />
              </TableRow>
            ))}
          </>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">WHY DRAFTS EXIST</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          A locked template cannot be edited. Changes go into a draft, which becomes a new version on publish.
          Existing projects stay on the version they started from unless a lead migrates them deliberately.
        </span>
      </Card>
    </div>
  );
}
