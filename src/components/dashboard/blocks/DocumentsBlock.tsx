import type { DashboardData } from "@/lib/dashboard/types";

export function DocumentsBlock({ data }: { data: DashboardData }) {
  const documents = data.documents ?? [];

  if (documents.length === 0) {
    return <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted">No documents shared yet.</div>;
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {documents.map((d, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-line-soft last:border-b-0 text-[12px]">
          <span className="text-ink font-semibold truncate">{d.name}</span>
          <span className="font-mono text-[9.5px] text-muted flex-none">{d.version}</span>
        </div>
      ))}
    </div>
  );
}
