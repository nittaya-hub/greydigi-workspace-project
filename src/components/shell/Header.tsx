"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

type Crumb = { label: string; href: string };

function breadcrumbSegments(pathname: string, selectedClientName: string | null): Crumb[] {
  if (pathname === "/") {
    const first = selectedClientName ? selectedClientName.toUpperCase() : "WORKSPACE";
    return [{ label: `${first} / OVERVIEW`, href: "/" }];
  }
  const rawSegments = pathname.split("/").filter(Boolean);
  let acc = "";
  return rawSegments.map((segment, i) => {
    acc += `/${segment}`;
    // `clients` has no human-readable `ref` column like projects/services
    // do, so its detail route is `/clients/<uuid>` — every other entity
    // segment here is already short and readable (a ref/code), but a raw
    // uuid rendered through the generic `.toUpperCase()` below reads as
    // garbage ("01EC5D5A 2E59 4947..."). Swap in the name of whichever
    // client the shell is actually scoped to right now (set by visiting
    // this exact page — see ShellChrome's `shell.selectedClient`) instead
    // of the id segment itself.
    if (rawSegments[i - 1] === "clients" && UUID_RE.test(segment)) {
      return { label: selectedClientName ? selectedClientName.toUpperCase() : "CLIENT", href: acc };
    }
    return { label: segment.replace(/-/g, " ").toUpperCase(), href: acc };
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The back arrow's target is computed by truncating the URL by one
 * segment, which assumes every intermediate segment is a real page --
 * true everywhere except this one route:
 * hypercare/clients/[id]/report-config has no page.tsx at
 * hypercare/clients/[id] itself (only report-config does, since this
 * is deliberately its own standalone page, not a tab under a client
 * detail view -- see that page's own comment), so truncating one
 * segment off it lands on a URL that 404s. The real "back" destination
 * for that page is /clients/[id] (its own top breadcrumb link already
 * goes there) -- rewritten here, the one confirmed gap after checking
 * every dynamic route in the app for the same "intermediate segment
 * isn't a real page" shape. */
const HYPERCARE_CLIENT_ROOT_RE = /^\/hypercare\/clients\/([0-9a-f-]{36})$/i;

function resolveParentHref(href: string | null): string | null {
  if (!href) return href;
  const match = href.match(HYPERCARE_CLIENT_ROOT_RE);
  return match ? `/clients/${match[1]}` : href;
}

export function Header({
  unreadNotifications,
  selectedClientName = null,
  onMenuClick,
}: {
  unreadNotifications: number;
  selectedClientName?: string | null;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const crumbs = breadcrumbSegments(pathname, selectedClientName);
  const parentHref = resolveParentHref(
    pathname === "/" ? null : crumbs.length > 1 ? crumbs[crumbs.length - 2].href : "/"
  );

  return (
    <div className="flex items-center gap-2.5 px-4 py-[11px] border-b border-line bg-paper/90">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="lg:hidden -ml-1 mr-1 flex-none w-8 h-8 flex items-center justify-center rounded-[7px] border border-line text-ink"
      >
        ☰
      </button>
      {parentHref ? (
        <Link
          href={parentHref}
          aria-label="Back to previous menu"
          title="Back"
          className="flex-none w-7 h-7 flex items-center justify-center rounded-[7px] border border-line text-ink hover:bg-coral-tint hover:border-coral/40"
        >
          ←
        </Link>
      ) : null}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-mono text-[10px] tracking-[.06em] text-muted truncate min-w-0">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1 min-w-0">
              {i > 0 ? <span className="text-line">/</span> : null}
              {isLast ? (
                <span className="text-ink truncate">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-ink hover:underline">
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <span className="flex-1" />
      <Link
        href="/search"
        className="hidden sm:flex items-center gap-2 border border-line bg-white rounded-[9px] px-[9px] py-[7px] text-[11px] text-muted-2 min-w-[160px]"
      >
        Search
        <span className="ml-auto font-mono text-[9px] border border-line rounded-[4px] px-[5px] py-px">/</span>
      </Link>
      <NotificationBell initialUnread={unreadNotifications} />
      <button
        type="button"
        className="bg-ink text-white rounded-[9px] px-[11px] py-[7px] text-[12px] font-semibold"
      >
        New
      </button>
    </div>
  );
}
