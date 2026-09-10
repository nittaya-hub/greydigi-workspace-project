"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
import clsx from "clsx";
import type { NotificationRow } from "@/lib/data/admin";
import { withTimeout } from "@/lib/withTimeout";
import { notificationCategory, timeAgo } from "@/lib/notifications";
import { archiveNotification, markNotificationRead } from "./actions";

function sourceTag(kind: string): { label: string; tone: "coral" | "neutral" } | null {
  const category = notificationCategory(kind);
  if (category === "hypercare") return { label: "HYPERCARE", tone: "coral" };
  if (category === "delivery") return { label: "DELIVERY", tone: "neutral" };
  return null;
}

/** One notification row — collapsed by default (title, who it's from,
 * age), expands on click to show the full body and a link to the
 * related page. Expanding is the read action (opening it to look at it
 * is what "read" means here); archiving is a separate, explicit button
 * so a notification you've merely glanced at doesn't disappear on its
 * own — you decide when it's done. */
export function NotificationRowItem({
  notification,
  variant,
  isLast,
}: {
  notification: NotificationRow;
  variant: "action" | "changed";
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optimisticRead, setOptimisticRead] = useState(notification.isRead);
  // Optimistic "just archived, hide immediately" — only meaningful in
  // the active list. The Archived filter's own rows start (and stay)
  // unarchived-locally so they render normally as history, not as a
  // notification mid-disappearing.
  const [archived, setArchived] = useState(false);
  const [, startTransition] = useTransition();

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !optimisticRead) {
      setOptimisticRead(true);
      startTransition(() => {
        withTimeout(markNotificationRead(notification.id)).catch(() => setOptimisticRead(false));
      });
    }
  }

  function handleArchive(e: MouseEvent) {
    e.stopPropagation();
    setArchived(true);
    startTransition(() => {
      withTimeout(archiveNotification(notification.id)).catch(() => setArchived(false));
    });
  }

  if (archived) return null;

  const dotClass =
    variant === "action" ? "bg-coral" : optimisticRead ? "bg-[#DCD8CE]" : "bg-ink";
  const tag = sourceTag(notification.kind);

  return (
    <div className={clsx(!isLast && "border-b border-line-soft", variant === "action" && "bg-[#FDFAF8]")}>
      <div className="flex items-center gap-2.5 px-4 py-[11px]">
        <button type="button" onClick={toggleExpand} className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
          <span className={clsx("w-1.5 h-1.5 rounded-full flex-none", dotClass)} />
          <span className="flex-1 flex flex-col gap-0.5 min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              {tag ? (
                <span
                  className={clsx(
                    "flex-none font-mono text-[8.5px] tracking-[.06em] rounded-[4px] px-[5px] py-px",
                    tag.tone === "coral" ? "bg-coral text-white" : "bg-idle-bg text-muted"
                  )}
                >
                  {tag.label}
                </span>
              ) : null}
              <span className={clsx("text-[12.5px] font-semibold truncate", optimisticRead && variant === "changed" ? "text-muted" : "text-ink")}>
                {notification.title}
              </span>
            </span>
            <span className="font-mono text-[9.5px] text-muted truncate">
              {[notification.actorLabel, timeAgo(notification.createdAt)].filter(Boolean).join(" · ")}
            </span>
          </span>
        </button>
        {notification.isArchived ? (
          <span className="flex-none font-mono text-[8.5px] tracking-[.04em] text-muted-2 px-1.5">ARCHIVED</span>
        ) : (
          <button
            type="button"
            onClick={handleArchive}
            aria-label="Archive"
            className="flex-none w-7 h-7 flex items-center justify-center rounded-[7px] text-muted-2 hover:bg-canvas hover:text-ink"
          >
            <Archive size={13} />
          </button>
        )}
      </div>
      {expanded ? (
        <div className="px-4 pb-3.5 pl-[26px] flex flex-col gap-2">
          {notification.body ? <p className="m-0 text-[12px] text-muted leading-[1.5]">{notification.body}</p> : null}
          {notification.relatedUrl ? (
            <Link href={notification.relatedUrl} className="w-fit bg-coral text-white rounded-[9px] px-[10px] py-[6px] text-[11px] font-semibold">
              Open
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
