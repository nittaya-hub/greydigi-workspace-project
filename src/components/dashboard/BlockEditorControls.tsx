"use client";

import { useState } from "react";
import type { DashboardSpace } from "@/lib/supabase/database.types";
import { METRICS_BY_SPACE, METRIC_LABELS, CHARTS_BY_SPACE, CHART_LABELS } from "@/lib/dashboard/metrics";
import { isAllowedEmbedUrl } from "@/lib/dashboard/embed-allowlist";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";

const inputClass = "border border-line bg-white rounded-[7px] px-2 py-1 text-[12px] w-full";

function TextControl({ config, onSave }: { config: Record<string, unknown>; onSave: (config: Record<string, unknown>) => void }) {
  const [draft, setDraft] = useState(typeof config.text === "string" ? config.text : "");
  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onSave({ text: draft })}
      rows={3}
      className={inputClass}
      placeholder="Write a short note for the client..."
    />
  );
}

function ImageControl({ config, onSave }: { config: Record<string, unknown>; onSave: (config: Record<string, unknown>) => void }) {
  const [url, setUrl] = useState(typeof config.url === "string" ? config.url : "");
  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => onSave({ url })}
        className={inputClass}
        placeholder="https://... image URL"
      />
      <input
        type="file"
        accept="image/*"
        className="text-[11px]"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result);
            setUrl(dataUrl);
            onSave({ url: dataUrl });
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}

function EmbedControl({ config, onSave }: { config: Record<string, unknown>; onSave: (config: Record<string, unknown>) => void }) {
  const [url, setUrl] = useState(typeof config.url === "string" ? config.url : "");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => {
          if (url && !isAllowedEmbedUrl(url)) {
            setError("Only YouTube, Vimeo, Loom, Figma, or Google Docs/Calendar links are allowed.");
            return;
          }
          setError(null);
          onSave({ url });
        }}
        className={inputClass}
        placeholder="https://... embed URL"
      />
      {error ? <span className="text-[10.5px] text-block-fg">{error}</span> : null}
    </div>
  );
}

function MetricControl({
  config,
  space,
  onSave,
}: {
  config: Record<string, unknown>;
  space: DashboardSpace;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const options = METRICS_BY_SPACE[space];
  const value = typeof config.metric === "string" ? config.metric : undefined;
  return (
    <Select
      value={value}
      items={options.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      onValueChange={(next) => onSave({ metric: next })}
    >
      <SelectTrigger className={inputClass}>
        <SelectValue placeholder="Choose a metric..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((m) => (
          <SelectItem key={m} value={m}>
            {METRIC_LABELS[m]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChartControl({
  config,
  space,
  onSave,
}: {
  config: Record<string, unknown>;
  space: DashboardSpace;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const options = CHARTS_BY_SPACE[space];
  const value = typeof config.series === "string" ? config.series : undefined;
  return (
    <Select
      value={value}
      items={options.map((s) => ({ value: s, label: CHART_LABELS[s] }))}
      onValueChange={(next) => onSave({ series: next })}
    >
      <SelectTrigger className={inputClass}>
        <SelectValue placeholder="Choose a chart..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {CHART_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The config form for a block, shown only in the admin editor — never a
 * free-text formula or raw HTML box. text/image/embed take a bounded
 * plain value; metric/chart pick from a fixed, space-scoped dropdown;
 * flight_plan/documents need no config at all. Each case is its own
 * component (not an inline branch) so hooks stay unconditional per the
 * rules of hooks — which control renders is what's conditional here. */
export function BlockEditorControls({
  block,
  space,
  onSave,
}: {
  block: DashboardBlockRow;
  space: DashboardSpace;
  onSave: (config: Record<string, unknown>) => void;
}) {
  switch (block.blockType) {
    case "text":
      return <TextControl config={block.config} onSave={onSave} />;
    case "image":
      return <ImageControl config={block.config} onSave={onSave} />;
    case "embed":
      return <EmbedControl config={block.config} onSave={onSave} />;
    case "metric":
      return <MetricControl config={block.config} space={space} onSave={onSave} />;
    case "chart":
      return <ChartControl config={block.config} space={space} onSave={onSave} />;
    case "flight_plan":
    case "documents":
      return <span className="text-[11px] text-muted">Reads live project data automatically — nothing to configure.</span>;
    default:
      return null;
  }
}
