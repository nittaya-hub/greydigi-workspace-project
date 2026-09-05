"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { ShellClientOption } from "@/lib/data/shell";
import { setSelectedClient } from "./actions";

/** Top-left scope switcher: "greydigi" (Master Admin — every client,
 * cross-client aggregates) or one specific client. Selecting a client
 * scopes Delivery and Hypercare data everywhere in the shell to it (see
 * src/lib/data/shell.ts and src/lib/data/client-scope.ts); Product stays
 * workspace-wide since it has no client_id in the schema. */
export function ClientSwitcher({
  workspaceName,
  selectedClient,
  clientOptions,
}: {
  workspaceName: string;
  selectedClient: ShellClientOption | null;
  clientOptions: ShellClientOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const label = selectedClient ? selectedClient.name : workspaceName;
  const scopeNote = selectedClient ? "CLIENT" : "MASTER ADMIN — ALL CLIENTS";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="w-full flex items-center justify-between bg-white/6 border border-white/10 rounded-[8px] px-2.5 py-2 text-[12px] font-medium hover:bg-white/8 disabled:opacity-60"
      >
        <span className="flex flex-col gap-0.5 min-w-0 items-start">
          <span className="font-mono text-[8.5px] tracking-[.09em] text-muted-2">{scopeNote}</span>
          <span className="truncate max-w-[170px]">{label}</span>
        </span>
        <span className={clsx("text-muted-2 text-[10px] transition-transform flex-none", open && "rotate-180")}>▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-ink-soft border border-white/12 rounded-[9px] shadow-xl overflow-hidden max-h-[320px] overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              startTransition(() => setSelectedClient(null));
            }}
            className={clsx(
              "w-full text-left px-3 py-2 text-[12px] flex items-center gap-2",
              !selectedClient ? "bg-white/8 font-semibold text-white" : "text-[#B9BDC7] hover:bg-white/6 hover:text-white"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-coral flex-none" />
            <span className="flex flex-col">
              <span>{workspaceName}</span>
              <span className="font-mono text-[8.5px] text-muted-2">MASTER ADMIN, ALL CLIENTS</span>
            </span>
          </button>
          {clientOptions.length > 0 ? (
            <div className="border-t border-white/10 py-1">
              {clientOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => setSelectedClient(c.id));
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-[7px] text-[12px] truncate",
                    selectedClient?.id === c.id ? "bg-white/8 font-semibold text-white" : "text-[#B9BDC7] hover:bg-white/6 hover:text-white"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="border-t border-white/10 py-1">
            <Link
              href="/clients"
              onClick={() => setOpen(false)}
              className="block px-3 py-[7px] text-[11.5px] font-medium text-coral hover:text-white"
            >
              Manage clients →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
