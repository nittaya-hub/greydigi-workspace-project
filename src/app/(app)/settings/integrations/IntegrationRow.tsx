"use client";

import { useTransition } from "react";
import { Pill } from "@/components/ui/Pill";
import { Toggle } from "@/components/ui/Toggle";
import { toggleIntegration } from "../actions";

export function IntegrationRow({
  workspaceId,
  integrationId,
  name,
  connected,
  connectedAt,
  isLast,
}: {
  workspaceId: string;
  integrationId: string;
  name: string;
  connected: boolean;
  connectedAt: string | null;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${isLast ? "" : "border-b border-line-soft"}`}>
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-ink">{name}</span>
        <span className="font-mono text-[9.5px] text-muted">
          {connected && connectedAt ? `CONNECTED ${new Date(connectedAt).toLocaleDateString()}` : "NOT CONNECTED"}
        </span>
      </span>
      <Pill tone={connected ? "done" : "idle"}>{connected ? "CONNECTED" : "NOT CONNECTED"}</Pill>
      <Toggle
        checked={connected}
        disabled={isPending}
        label={`${connected ? "Disconnect" : "Connect"} ${name}`}
        onChange={() => startTransition(() => toggleIntegration(workspaceId, integrationId, name, !connected))}
      />
    </div>
  );
}
