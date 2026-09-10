import { PageHeading } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listSubmissionTaxonomyOptions } from "@/lib/data/submission-taxonomies";
import type { SubmissionTaxonomyOption } from "@/lib/data/submission-taxonomies";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shadcn/card";
import { SubmissionTaxonomyRow } from "./SubmissionTaxonomyRow";
import { AddTaxonomyOptionForm } from "./AddTaxonomyOptionForm";

const GROUPS: {
  kind: SubmissionTaxonomyOption["kind"];
  field: SubmissionTaxonomyOption["field"];
  title: string;
  description: string;
}[] = [
  { kind: "issue", field: "category", title: "Report an issue — category", description: "Shown on the CATEGORY select of the client portal's Report an issue form." },
  { kind: "issue", field: "severity", title: "Report an issue — severity", description: "Shown on the SEVERITY select of the client portal's Report an issue form." },
  { kind: "change_request", field: "priority", title: "Change request — priority", description: "Shown on the PRIORITY select of the client portal's Change request form." },
];

export default async function SubmissionSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Submission types" />;

  const workspaceId = await getCurrentWorkspaceId();
  const options = workspaceId ? await listSubmissionTaxonomyOptions(workspaceId) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Submission types"
        description="The category, severity and priority options a client sees on the portal's Report an issue, Change request and Ask a question forms. Retire an option instead of deleting it — past submissions keep whatever value they were filed under."
      />

      <div className="grid md:grid-cols-3 gap-4">
        {GROUPS.map((group) => {
          const rows = options.filter((o) => o.kind === group.kind && o.field === group.field);
          return (
            <Card key={`${group.kind}-${group.field}`} className="p-0">
              <CardHeader className="px-4 pt-4 pb-0">
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                {rows.length === 0 ? (
                  <div className="py-6 px-4 text-center text-[11.5px] text-muted">No options yet.</div>
                ) : (
                  <div className="grid grid-cols-[100px_1fr_auto_60px] gap-2.5 px-4 py-2 bg-[#FCFCFA] border-y border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
                    <span>VALUE</span>
                    <span>LABEL</span>
                    <span>STATUS</span>
                    <span />
                  </div>
                )}
                {workspaceId
                  ? rows.map((r) => (
                      <SubmissionTaxonomyRow
                        key={r.id}
                        optionId={r.id}
                        workspaceId={workspaceId}
                        value={r.value}
                        label={r.label}
                        isActive={r.isActive}
                      />
                    ))
                  : null}
                {workspaceId ? (
                  <div className="border-t border-line-soft">
                    <AddTaxonomyOptionForm workspaceId={workspaceId} kind={group.kind} field={group.field} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
