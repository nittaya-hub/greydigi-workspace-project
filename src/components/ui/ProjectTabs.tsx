"use client";

import { usePathname } from "next/navigation";
import { Tabs, Tab } from "@/components/ui/Tabs";

export function ProjectTabs({ tabs }: { tabs: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <Tabs>
      {tabs.map((t) => (
        <Tab key={t.href} href={t.href} active={pathname === t.href}>
          {t.label}
        </Tab>
      ))}
    </Tabs>
  );
}
