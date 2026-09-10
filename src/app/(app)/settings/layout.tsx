import type { ReactNode } from "react";

/** No longer renders its own in-page nav card (SettingsNav.tsx, removed)
 * — every settings page is now reachable from the sidebar's Settings
 * section instead (src/components/shell/nav-config.ts,
 * SETTINGS_NAV_GROUPS), so the two never drifted apart or duplicated
 * each other. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 sm:px-7 sm:py-8 max-w-[1300px] mx-auto">{children}</div>;
}
