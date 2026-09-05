import Link from "next/link";
import { PageHeading, Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { listNotifications } from "@/lib/data/admin";
import { MarkAllReadButton } from "./MarkAllReadButton";

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "JUST NOW";
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

const ACTION_KINDS = new Set(["gate_held", "incident", "change_request"]);

export default async function NotificationsPage() {
  const notifications = await listNotifications();
  const actionNeeded = notifications.filter((n) => !n.isRead && ACTION_KINDS.has(n.kind));
  const changed = notifications.filter((n) => !actionNeeded.includes(n));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Notifications" description="Action needed first, then things that changed. Read state is per person." />
        <MarkAllReadButton />
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState title="You are up to date." description="Nothing needs you right now. Gate changes, escalations and signatures will appear here." />
        </Card>
      ) : (
        <>
          {actionNeeded.length > 0 ? (
            <Card>
              <CardHeader title="Action needed" note={String(actionNeeded.length)} />
              {actionNeeded.map((n, i) => (
                <div key={n.id} className={`flex items-center gap-2.5 px-4 py-[11px] bg-[#FDFAF8] ${i < actionNeeded.length - 1 ? "border-b border-line-soft" : ""}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-coral flex-none" />
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[12.5px] font-semibold text-ink">{n.title}</span>
                    <span className="font-mono text-[9.5px] text-muted">{n.body ?? timeAgo(n.createdAt)}</span>
                  </span>
                  {n.relatedUrl ? (
                    <Link href={n.relatedUrl} className="bg-coral text-white rounded-[9px] px-[10px] py-[6px] text-[11px] font-semibold">
                      Open
                    </Link>
                  ) : null}
                </div>
              ))}
            </Card>
          ) : null}

          {changed.length > 0 ? (
            <Card>
              <CardHeader title="Changed" note={String(changed.length)} />
              {changed.map((n, i) => (
                <div key={n.id} className={`flex items-center gap-2.5 px-4 py-[11px] ${i < changed.length - 1 ? "border-b border-line-soft" : ""}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-none ${n.isRead ? "bg-[#DCD8CE]" : "bg-ink"}`} />
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className={`text-[12.5px] font-semibold ${n.isRead ? "text-muted" : "text-ink"}`}>{n.title}</span>
                    <span className="font-mono text-[9.5px] text-muted">{n.body ?? timeAgo(n.createdAt)}</span>
                  </span>
                </div>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
