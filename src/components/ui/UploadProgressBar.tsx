/** Shared progress display for any "upload and import" flow -- percent
 * plus a short stage label, so a user watching a multi-second import
 * (upload, save, map) sees it moving rather than a dead button. */
export function UploadProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex flex-col gap-1 w-full max-w-[240px]">
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="font-mono">{Math.round(percent)}%</span>
      </div>
      <div className="h-[6px] w-full rounded-full bg-line-soft overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
