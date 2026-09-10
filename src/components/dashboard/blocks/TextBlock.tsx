export function TextBlock({ config }: { config: Record<string, unknown> }) {
  const text = typeof config.text === "string" ? config.text : "";
  return (
    <div className="h-full overflow-y-auto p-3.5 text-[12.5px] text-ink leading-[1.55] whitespace-pre-wrap">
      {text || <span className="text-muted">Empty text block.</span>}
    </div>
  );
}
