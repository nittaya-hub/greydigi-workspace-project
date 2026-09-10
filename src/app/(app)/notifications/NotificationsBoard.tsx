"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Card, EmptyState } from "@/components/ui/Card";
import type { NotificationRow } from "@/lib/data/admin";
import { isActionNeeded, notificationCategory, type NotificationCategory } from "@/lib/notifications";
import { NotificationRowItem } from "./NotificationRowItem";

const PAGE_SIZE = 20;

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  hypercare: "HYPERCARE",
  delivery: "DELIVERY",
  other: "OTHER",
};

type FilterKey = "all" | "action" | NotificationCategory;

/** Search box + category filter pills (Action needed / Delivery /
 * Hypercare / Other) + 20-per-page pagination, replacing the old fixed
 * "Action needed" / "Changed" two-card split — filtering by pill covers
 * the same "action needed first" need while also letting the team file
 * notifications by which space they're about, and gives pagination
 * something single and flat to page through instead of two independent
 * lists. */
export function NotificationsBoard({ notifications }: { notifications: NotificationRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(0);

  const actionCount = notifications.filter((n) => !n.isRead && isActionNeeded(n.kind)).length;
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = { hypercare: 0, delivery: 0, other: 0 };
    for (const n of notifications) counts[notificationCategory(n.kind)]++;
    return counts;
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "action" && !(!n.isRead && isActionNeeded(n.kind))) return false;
      if (filter !== "all" && filter !== "action" && notificationCategory(n.kind) !== filter) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || (n.body ?? "").toLowerCase().includes(q);
    });
  }, [notifications, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setFilterAndResetPage(next: FilterKey) {
    setFilter(next);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none">
            <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13L17.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search notifications..."
            className="w-full rounded-full border border-line bg-white pl-8 pr-3 py-1.5 text-[12px] text-ink placeholder:text-muted-2 focus:outline-none focus:border-coral"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterAndResetPage("all")}
            className={clsx(
              "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
              filter === "all" ? "bg-ink text-white" : "border border-line text-coral"
            )}
          >
            ALL {notifications.length}
          </button>
          {actionCount > 0 ? (
            <button
              type="button"
              onClick={() => setFilterAndResetPage("action")}
              className={clsx(
                "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                filter === "action" ? "bg-ink text-white" : "border border-line text-coral"
              )}
            >
              ACTION NEEDED {actionCount}
            </button>
          ) : null}
          {(["delivery", "hypercare", "other"] as const)
            .filter((c) => categoryCounts[c] > 0)
            .map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterAndResetPage(c)}
                className={clsx(
                  "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                  filter === c ? "bg-ink text-white" : "border border-line text-coral"
                )}
              >
                {CATEGORY_LABEL[c]} {categoryCounts[c]}
              </button>
            ))}
        </div>
      </div>

      <Card>
        {pageRows.length === 0 ? (
          <EmptyState
            title={notifications.length === 0 ? "You are up to date." : "No notifications match this search."}
            description={
              notifications.length === 0
                ? "Nothing needs you right now. Gate changes, escalations and signatures will appear here."
                : "Try a different search or filter."
            }
          />
        ) : (
          pageRows.map((n, i) => (
            <NotificationRowItem
              key={n.id}
              notification={n}
              variant={!n.isRead && isActionNeeded(n.kind) ? "action" : "changed"}
              isLast={i === pageRows.length - 1}
            />
          ))
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages} · {filtered.length} NOTIFICATION{filtered.length === 1 ? "" : "S"}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              PREV
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              NEXT
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
