"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { testAnthropicConnection } from "./actions";

export function AnthropicConnectionCard({ configured }: { configured: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex items-center gap-2.5 px-4 py-[11px] text-[12px]">
      <span className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-[12.5px] font-semibold text-ink">AI provider (Anthropic / Claude)</span>
        <span className="font-mono text-[9.5px] text-muted">
          POWERS CHECKPOINT &ldquo;RUN AUTO-MAP&rdquo; · ANTHROPIC_API_KEY {configured ? "IS SET" : "NOT SET"}
        </span>
        {result ? (
          <span className={`text-[11px] mt-0.5 ${result.ok ? "text-ok-fg" : "text-block-fg"}`}>{result.message}</span>
        ) : null}
      </span>
      <Pill tone={configured ? "done" : "idle"}>{configured ? "KEY SET" : "NOT SET"}</Pill>
      <Button
        variant="secondary"
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await testAnthropicConnection();
            setResult(r);
          })
        }
      >
        {isPending ? "Testing..." : "Test connection"}
      </Button>
    </div>
  );
}
