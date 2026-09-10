"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import type { NotificationRow } from "@/lib/data/admin";
import { notificationCategory } from "@/lib/notifications";
import { getRecentNotificationsForBell, getUnreadNotificationCount, markNotificationRead } from "@/app/(app)/notifications/actions";

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "JUST NOW";
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

/** The header's Notifications button — a live-updating count badge plus
 * a dropdown preview of the 5 newest unread notifications, so the team
 * doesn't have to leave whatever page they're on to notice something
 * needs them. Urgent/client-origin ones (Hypercare) get a red
 * background, matching the same "this is live production support
 * waiting" urgency the tag on the full /notifications list already
 * uses. Polls the count every 5s (a submission through a no-login share
 * link has nothing else to trigger a re-render with) and fetches the
 * preview list fresh each time the dropdown opens. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      getUnreadNotificationCount()
        .then(setUnread)
        .catch(() => {});
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getRecentNotificationsForBell(5)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  function handleRowClick(id: string) {
    markNotificationRead(id).catch(() => {});
    setUnread((n) => Math.max(0, n - 1));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-[7px] border border-line bg-white rounded-[9px] px-[9px] py-[7px] text-[11px] text-ink">
        <span className="hidden sm:inline">Notifications</span>
        <span aria-hidden className="sm:hidden">
          🔔
        </span>
        {unread > 0 ? <span className="bg-coral text-white font-mono text-[8.5px] rounded-[9px] px-[5px] py-px">{unread}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 gap-0">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line-soft">
          <span className="font-display font-extrabold text-[12.5px] text-ink">Notifications</span>
          {unread > 0 ? <span className="font-mono text-[9px] text-muted">{unread} UNREAD</span> : null}
        </div>
        {items === null ? (
          <div className="px-3.5 py-8 text-center text-[11.5px] text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-3.5 py-8 text-center text-[11.5px] text-muted">You are up to date.</div>
        ) : (
          <div className="flex flex-col">
            {items.map((n) => {
              const category = notificationCategory(n.kind);
              return (
                <Link
                  key={n.id}
                  href={n.relatedUrl ?? "/notifications"}
                  onClick={() => handleRowClick(n.id)}
                  className={clsx(
                    "flex flex-col gap-0.5 px-3.5 py-2.5 border-b border-line-soft last:border-0 hover:bg-canvas",
                    category === "hypercare" && "bg-block-bg",
                    category === "delivery" && "bg-coral-tint"
                  )}
                >
                  <span
                    className={clsx(
                      "text-[12px] font-semibold truncate",
                      category === "hypercare" ? "text-block-fg" : "text-ink"
                    )}
                  >
                    {n.title}
                  </span>
                  <span className="font-mono text-[9px] text-muted truncate">{timeAgo(n.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block text-center px-3.5 py-2.5 border-t border-line text-[11.5px] font-semibold text-coral hover:bg-canvas"
        >
          View all →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
