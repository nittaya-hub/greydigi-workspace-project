"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Toggle } from "@/components/ui/Toggle";
import type { AgentConnectionRow as AgentConnectionRowType } from "@/lib/data/agents";
import { testAgentConnectionRow, toggleAgentConnectionEnabled } from "./actions";

const STATUS_TONE = { not_configured: "idle", needs_verification: "waiting_on_client", verified: "done", failed: "blocked" } as const;

export function AgentConnectionRow({ connection, isLast }: { connection: AgentConnectionRowType; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] flex-wrap ${isLast ? "" : "border-b border-line-soft"}`}>
      <span className="flex-1 flex flex-col gap-0.5 min-w-[180px]">
        <span className="text-[12.5px] font-semibold text-ink">{connection.name}</span>
        <span className="font-mono text-[9.5px] text-muted truncate">
          {connection.connectorType === "n8n_workflow" ? "N8N WORKFLOW" : "EXTERNAL API"} · {connection.endpointUrl ?? "NO ENDPOINT SET"}
        </span>
        {result ? <span className={`text-[11px] mt-0.5 ${result.ok ? "text-ok-fg" : "text-block-fg"}`}>{result.message}</span> : null}
      </span>
      <Pill tone={STATUS_TONE[connection.status]}>{connection.status.replace("_", " ").toUpperCase()}</Pill>
      <Button
        variant="secondary"
        type="button"
        disabled={isPending || !connection.enabled}
        onClick={() =>
          startTransition(async () => {
            const r = await testAgentConnectionRow(connection.id);
            setResult(r);
          })
        }
      >
        {isPending ? "Testing..." : "Test connection"}
      </Button>
      <Toggle
        checked={connection.enabled}
        disabled={isPending}
        label={`${connection.enabled ? "Disable" : "Enable"} ${connection.name}`}
        onChange={() => startTransition(() => toggleAgentConnectionEnabled(connection.id, !connection.enabled))}
      />
    </div>
  );
}
