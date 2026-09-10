"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import type { ShellData } from "@/lib/data/shell";

/**
 * Owns the mobile drawer state so Header's hamburger and Sidebar's
 * off-canvas panel stay in sync without extra plumbing through layouts.
 * Desktop (lg+): sidebar is a fixed 252px column, always visible.
 * Below lg: sidebar becomes a slide-over drawer.
 */
export function ShellChrome({ shell, children }: { shell: ShellData; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar shell={shell} />
      </div>

      {/* Mobile drawer */}
      <div
        className={clsx(
          "fixed inset-0 z-40 lg:hidden transition-opacity",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
        <div
          className={clsx(
            "absolute inset-y-0 left-0 h-full shadow-xl transition-transform duration-200",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar shell={shell} onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Header
          unreadNotifications={shell.counts.unreadNotifications}
          selectedClientName={shell.selectedClient?.name ?? null}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
