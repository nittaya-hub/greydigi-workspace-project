"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const SECTIONS = [
  { label: "General", href: "/settings" },
  { label: "Spaces", href: "/settings#spaces" },
  { label: "SLA policies", href: "/settings/sla" },
  { label: "Portal and branding", href: "/settings/portal" },
  { label: "Integrations", href: "/settings/integrations" },
  { label: "Audit log", href: "/settings/audit" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <div className="flex lg:flex-col gap-0.5 overflow-x-auto">
      {SECTIONS.map((s) => {
        const active = !s.href.includes("#") && pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={clsx(
              "px-2.5 py-1.5 rounded-[7px] text-[12px] whitespace-nowrap flex-none",
              active ? "bg-white border border-line font-semibold text-ink" : "text-muted hover:text-ink"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
