"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Crumb = { label: string; href: string };

function breadcrumbSegments(pathname: string): Crumb[] {
  if (pathname === "/") return [{ label: "WORKSPACE / OVERVIEW", href: "/" }];
  const rawSegments = pathname.split("/").filter(Boolean);
  let acc = "";
  return rawSegments.map((segment) => {
    acc += `/${segment}`;
    return { label: segment.replace(/-/g, " ").toUpperCase(), href: acc };
  });
}

export function Header({
  unreadNotifications,
  onMenuClick,
}: {
  unreadNotifications: number;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const crumbs = breadcrumbSegments(pathname);
  const parentHref =
    pathname === "/" ? null : crumbs.length > 1 ? crumbs[crumbs.length - 2].href : "/";

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
      <Link
        href="/notifications"
        className="flex items-center gap-[7px] border border-line bg-white rounded-[9px] px-[9px] py-[7px] text-[11px] text-ink"
      >
        <span className="hidden sm:inline">Notifications</span>
        <span aria-hidden className="sm:hidden">🔔</span>
        {unreadNotifications > 0 ? (
          <span className="bg-coral text-white font-mono text-[8.5px] rounded-[9px] px-[5px] py-px">
            {unreadNotifications}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        className="bg-ink text-white rounded-[9px] px-[11px] py-[7px] text-[12px] font-semibold"
      >
        New
      </button>
    </div>
  );
}
