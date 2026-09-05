"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SPACES, SETTINGS_NAV, WORKSPACE_NAV, type NavItem, type SpaceKey } from "@/components/shell/nav-config";
import { ProjectMiniNav } from "@/components/shell/ProjectMiniNav";
import { ClientSwitcher } from "@/components/shell/ClientSwitcher";
import type { ShellData } from "@/lib/data/shell";

const SPACE_COUNT_KEY: Record<SpaceKey, keyof ShellData["counts"]> = {
  delivery: "delivery",
  product: "product",
  hypercare: "hypercare",
};

function activeSpaceFromPath(pathname: string): SpaceKey | null {
  if (pathname.startsWith("/delivery")) return "delivery";
  if (pathname.startsWith("/product")) return "product";
  if (pathname.startsWith("/hypercare")) return "hypercare";
  return null;
}

const SETTINGS_PATH_PREFIXES = ["/settings", "/people", "/templates", "/notifications"];

function isSettingsPath(pathname: string): boolean {
  return SETTINGS_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count?: number | string }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-[12px]",
        active ? "font-semibold text-white bg-white/8" : "text-[#B9BDC7] hover:text-white"
      )}
    >
      <span className={clsx("w-0.5 h-3.5 flex-none rounded-sm", active ? "bg-coral" : "bg-transparent")} />
      <span className="flex-1">{item.label}</span>
      {count !== undefined ? (
        <span
          className={clsx(
            "font-mono text-[9.5px]",
            item.countTone === "coral" ? "text-coral" : "text-muted-2"
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function SpaceSection({
  space,
  active,
  count,
  pathname,
}: {
  space: (typeof SPACES)[number];
  active: boolean;
  count: number;
  pathname: string;
}) {
  const countTone = space.key === "hypercare" && count > 0 ? "coral" : "muted";

  if (!active) {
    return (
      <NavLink
        item={{ label: space.label, href: `/${space.key}`, countTone }}
        active={false}
        count={count}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-[12px] font-semibold text-white bg-white/8">
        <span className="w-0.5 h-3.5 flex-none rounded-sm bg-coral" />
        <span className="flex-1">{space.label}</span>
        <span className={clsx("font-mono text-[9.5px]", countTone === "coral" ? "text-coral" : "text-muted-2")}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 my-0.5 ml-[11px] pl-[9px] border-l border-white/10">
        {space.nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-[6px] px-2 py-1.5 text-[11.5px]",
              pathname === item.href ? "font-semibold text-white bg-white/6" : "text-[#B9BDC7] hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SettingsSection({ active, pathname, counts }: { active: boolean; pathname: string; counts: { people: number; templates: number } }) {
  if (!active) {
    return <NavLink item={{ label: "Settings", href: "/settings" }} active={false} />;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-[9px] rounded-[7px] px-2 py-1.5 text-[12px] font-semibold text-white bg-white/8">
        <span className="w-0.5 h-3.5 flex-none rounded-sm bg-coral" />
        <span className="flex-1">Settings</span>
      </div>
      <div className="flex flex-col gap-0.5 my-0.5 ml-[11px] pl-[9px] border-l border-white/10">
        {SETTINGS_NAV.map((item) => {
          const count = item.href === "/people" ? counts.people : item.href === "/templates" ? counts.templates : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px]",
                pathname === item.href ? "font-semibold text-white bg-white/6" : "text-[#B9BDC7] hover:text-white"
              )}
            >
              <span className="flex-1">{item.label}</span>
              {count !== undefined ? <span className="font-mono text-[9.5px] text-muted-2">{count}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ shell, onNavigate }: { shell: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeSpace = activeSpaceFromPath(pathname);
  const settingsActive = activeSpace === null && isSettingsPath(pathname);
  const isWorkspaceCore = activeSpace === null && !settingsActive;
  const spaces = shell.selectedClient && !shell.selectedClient.hypercareEnabled ? SPACES.filter((s) => s.key !== "hypercare") : SPACES;

  return (
    <div
      onClick={onNavigate}
      className="w-[252px] flex-none bg-ink text-[#EDEEF1] flex flex-col h-full overflow-y-auto"
    >
      <div className="px-4 pt-[18px] pb-3.5 flex flex-col gap-3">
        <div className="flex items-center gap-[9px]">
          <Image
            src="/greydigi-logo.png"
            alt="greydigi"
            width={22}
            height={22}
            className="rounded-[6px] flex-none"
          />
          <span className="font-display font-extrabold text-[14px] tracking-[-0.01em]">greydigi</span>
          <span className="font-mono text-[9px] text-muted-2 border border-white/16 rounded-[4px] px-[5px] py-0.5">
            WORKSPACE
          </span>
        </div>
        <ClientSwitcher
          workspaceName={shell.workspaceName}
          selectedClient={shell.selectedClient}
          clientOptions={shell.clientOptions}
        />
      </div>
      {shell.selectedClient ? (
        <div className="mx-4 mb-3 px-2.5 py-1.5 rounded-[7px] bg-coral/15 border border-coral/25 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-coral flex-none" />
          <span className="font-mono text-[9px] tracking-[.04em] text-[#FFB8A6] truncate">
            SCOPED TO {shell.selectedClient.name.toUpperCase()}
          </span>
        </div>
      ) : null}

      <nav className="px-[9px] flex flex-col gap-0.5 flex-1">
        {shell.selectedClient ? (
          <NavLink
            item={{ label: `${shell.selectedClient.name} Overview`, href: `/clients/${shell.selectedClient.id}` }}
            active={pathname === `/clients/${shell.selectedClient.id}`}
          />
        ) : (
          <>
            <div className="font-mono text-[8.5px] tracking-[.1em] text-muted-2 px-2 pt-2.5 pb-[5px]">WORKSPACE</div>
            {WORKSPACE_NAV.map((item) => {
              const active = isWorkspaceCore && pathname === item.href;
              const label = item.href === "/" ? `${shell.workspaceName} Overview` : item.label;
              return <NavLink key={item.href} item={{ ...item, label }} active={active} />;
            })}
            <SettingsSection active={settingsActive} pathname={pathname} counts={{ people: shell.counts.people, templates: shell.counts.templates }} />
          </>
        )}

        <div className="font-mono text-[8.5px] tracking-[.1em] text-muted-2 px-2 pt-4 pb-[5px]">SPACES</div>
        {spaces.map((space) => (
          <SpaceSection
            key={space.key}
            space={space}
            active={activeSpace === space.key}
            count={shell.counts[SPACE_COUNT_KEY[space.key]]}
            pathname={pathname}
          />
        ))}

        {activeSpace === "delivery" ? <ProjectMiniNav /> : null}
      </nav>

      <div className="mt-auto px-4 pt-3.5 pb-[18px] border-t border-white/8 flex items-center gap-[9px]">
        {shell.person ? (
          <>
            <span className="w-[26px] h-[26px] rounded-full bg-ink-soft text-white text-[10px] flex items-center justify-center flex-none">
              {shell.person.initials}
            </span>
            <span className="flex flex-col flex-1 min-w-0">
              <span className="text-[11.5px] font-semibold truncate">{shell.person.fullName}</span>
              <span className="font-mono text-[9px] text-muted-2">{shell.person.roleLabel}</span>
            </span>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="border border-white/20 rounded-[6px] px-[6px] py-1 font-mono text-[9px] text-[#B9BDC7] hover:text-white"
              >
                LOG OUT
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/auth/sign-in"
            className="border border-white/20 rounded-[6px] px-[10px] py-1.5 font-mono text-[10px] text-[#B9BDC7] hover:text-white"
          >
            SIGN IN
          </Link>
        )}
      </div>
    </div>
  );
}
