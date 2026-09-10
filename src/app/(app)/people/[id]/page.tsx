import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, StatTile, EmptyState } from "@/components/ui/Card";
import { Pill, TaskStatusPill } from "@/components/ui/Pill";
import { getPersonProfile, type PersonWorkItem } from "@/lib/data/person";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { ExportCsvButton } from "./ExportCsvButton";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";

const ROLE_LABEL: Record<string, string> = {
  workspace_admin: "WORKSPACE ADMIN",
  delivery_lead: "DELIVERY LEAD",
  product_lead: "PRODUCT LEAD",
  hypercare_lead: "HYPERCARE LEAD",
  member: "MEMBER",
  client: "CLIENT",
};

const SPACE_LABEL: Record<PersonWorkItem["space"], string> = { delivery: "DELIVERY", product: "PRODUCT" };

function WorkList({ items, emptyLabel }: { items: PersonWorkItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <div className="py-8 px-4 text-center text-[11.5px] text-muted">{emptyLabel}</div>;
  }
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <Link
          key={`${item.space}-${item.ref}`}
          href={item.href}
          className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] hover:bg-canvas ${i < items.length - 1 ? "border-b border-line-soft" : ""}`}
        >
          <Pill tone="ghost" className="flex-none">
            {SPACE_LABEL[item.space]}
          </Pill>
          <span className="flex-1 flex flex-col gap-0.5 min-w-0">
            <span className="text-[12.5px] font-semibold text-ink truncate">{item.title}</span>
            <span className="font-mono text-[9.5px] text-muted truncate">
              {item.ref} · {item.contextName}
              {item.dueDate ? ` · DUE ${item.dueDate}` : ""}
            </span>
          </span>
          <TaskStatusPill status={item.status} className="flex-none" />
        </Link>
      ))}
    </div>
  );
}

/** Own data always exportable; a workspace_admin can export anyone's. This
 * is a performance/output summary (what shipped, what's in flight) — not
 * rate, salary, or billing data, which the schema doesn't track at all. */
function canExport(viewerId: string | undefined, viewerRole: string | undefined, personId: string) {
  if (!viewerId) return false;
  return viewerId === personId || viewerRole === "workspace_admin";
}

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, viewer] = await Promise.all([getPersonProfile(id), getCurrentPerson()]);
  if (!person) notFound();

  const exportRows = [
    ...person.current.map((i) => ({ stage: "current", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
    ...person.next.map((i) => ({ stage: "next", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
    ...person.completed.map((i) => ({ stage: "completed", space: i.space, ref: i.ref, title: i.title, status: i.status, context: i.contextName, due: i.dueDate ?? "" })),
  ];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[900px] mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <span className="font-mono text-[9.5px] text-muted">{ROLE_LABEL[person.workspaceRole] ?? person.workspaceRole.toUpperCase()}</span>
          <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{person.fullName}</h1>
        </div>
        {canExport(viewer?.id, viewer?.workspace_role, person.id) ? (
          <div className="flex gap-1.5 flex-none">
            <ExportCsvButton rows={exportRows} filename={`${person.fullName.replace(/\s+/g, "-").toLowerCase()}-work-summary.csv`} />
            <ExportPdfButton
              href={`/people/${person.id}/pdf`}
              fallbackFilename={`${person.fullName.replace(/\s+/g, "-").toLowerCase()}-work-summary.pdf`}
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="CURRENT" value={person.current.length} note="In progress across spaces" />
        <StatTile label="NEXT UP" value={person.next.length} note="Assigned, not started" />
        <StatTile label="COMPLETED" value={person.completed.length} note="All time" />
      </div>

      <Card>
        <CardHeader title="Current work" note="WHAT THEY'RE DOING NOW" />
        <WorkList items={person.current} emptyLabel="Nothing in progress right now." />
      </Card>

      <Card>
        <CardHeader title="Next up" note="ASSIGNED, NOT STARTED" />
        <WorkList items={person.next} emptyLabel="Nothing queued." />
      </Card>

      <Card>
        <CardHeader title="Completed" note="MOST RECENT FIRST" />
        {person.completed.length === 0 ? (
          <EmptyState title="Nothing completed yet." />
        ) : (
          <WorkList items={person.completed.slice(0, 20)} emptyLabel="Nothing completed yet." />
        )}
      </Card>
    </div>
  );
}
