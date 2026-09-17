import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getMyQueue, type QueueItem } from "@/lib/data/queue";

const SPACE_LABEL: Record<QueueItem["space"], string> = { missions: "MISSIONS", hypercare: "HYPERCARE" };

function urgencyLabel(item: QueueItem): string | null {
  if (!item.urgentAt) return null;
  const date = item.urgentAt.slice(0, 10);
  return item.overdue ? `Overdue — was due ${date}` : `Due ${date}`;
}

export default async function QueuePage() {
  const person = await getCurrentPerson();
  const items = person ? await getMyQueue(person.id) : [];
  const overdueCount = items.filter((i) => i.overdue).length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[900px] mx-auto">
      <PageHeading
        title="My queue"
        description="Everything assigned to you across Missions and Hypercare, in one list — overdue and soon-to-breach items first."
      />

      {!person ? (
        <EmptyState title="Sign in to see your queue." description="This list is personal — it shows only what's assigned to you." />
      ) : items.length === 0 ? (
        <EmptyState title="Queue is clear." description="Nothing assigned to you right now in Missions or Hypercare." />
      ) : (
        <Card>
          <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
            <span className="font-display font-extrabold text-[13.5px]">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
            {overdueCount > 0 ? <Pill tone="blocked">{overdueCount} OVERDUE</Pill> : null}
          </div>
          <div className="flex flex-col">
            {items.map((item, i) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper ${i < items.length - 1 ? "border-b border-line-soft" : ""}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12.5px] font-semibold text-ink truncate">{item.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    {item.ref} · {item.contextLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  {urgencyLabel(item) ? (
                    <span className={`font-mono text-[9.5px] ${item.overdue ? "text-coral font-semibold" : "text-muted"}`}>
                      {urgencyLabel(item)}
                    </span>
                  ) : null}
                  <Pill tone="idle">{SPACE_LABEL[item.space]}</Pill>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
