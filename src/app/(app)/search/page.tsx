import { PageHeading, Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { search } from "@/lib/data/admin";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const results = workspaceId && q ? await search(workspaceId, q) : { projects: [], incidents: [], documents: [], changeRequests: [] };
  const total = results.projects.length + results.incidents.length + results.documents.length + results.changeRequests.length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading title="Search" description="Grouped by record type, scoped by permission." />

      <form method="get" className="flex items-center gap-2 border border-ink bg-white rounded-[9px] px-[13px] py-[11px]">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search projects, incidents, documents..."
          className="flex-1 text-[13px] outline-none"
          autoFocus
        />
      </form>

      {!q ? (
        <Card>
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">Start typing to search across the workspace.</div>
        </Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            title={`Nothing matches "${q}".`}
            description="Results only include records your roles can see, so a missing item may be a permission, not an absence."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {results.projects.length > 0 ? (
            <Card>
              <CardHeader title="Projects" />
              {results.projects.map((p) => (
                <div key={p.ref} className="px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12.5px] font-semibold text-ink">
                  {p.ref} {p.name}
                </div>
              ))}
            </Card>
          ) : null}
          {results.incidents.length > 0 ? (
            <Card>
              <CardHeader title="Incidents" />
              {results.incidents.map((inc) => (
                <div key={inc.ref} className="flex items-center gap-2.5 px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                  <Pill tone={inc.severity === "sev1" ? "blocked" : "idle"}>{inc.severity.toUpperCase()}</Pill>
                  <span className="text-[12.5px] font-semibold text-ink">{inc.ref} {inc.title}</span>
                </div>
              ))}
            </Card>
          ) : null}
          {results.documents.length > 0 ? (
            <Card>
              <CardHeader title="Documents" />
              {results.documents.map((d, i) => (
                <div key={i} className="px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12.5px] font-semibold text-ink">
                  {d.name} <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                </div>
              ))}
            </Card>
          ) : null}
          {results.changeRequests.length > 0 ? (
            <Card>
              <CardHeader title="Change requests" />
              {results.changeRequests.map((c) => (
                <div key={c.ref} className="flex items-center gap-2.5 px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                  <Pill tone="in_progress">{c.status.toUpperCase()}</Pill>
                  <span className="text-[12.5px] font-semibold text-ink">{c.ref} {c.title}</span>
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
