import type { ReactNode } from "react";
import { SettingsNav } from "./SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 max-w-[1300px]">
      <div className="grid lg:grid-cols-[150px_1fr] gap-4 items-start">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
