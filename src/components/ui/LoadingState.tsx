/** Shared fallback for every route segment's `loading.tsx` -- there
 * were none anywhere in the app, so a slower page (several parallel
 * Supabase queries, a Puppeteer-backed export, ...) just left the
 * previous page sitting on screen with nothing to say a new one was
 * on its way, which read as the click having done nothing. Deliberately
 * one small spinner + label rather than a per-page skeleton: it has to
 * make sense generically across every route it covers. */
export function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-coral animate-spin" aria-hidden />
        <span className="font-mono text-[10px] tracking-[.08em] text-muted">LOADING…</span>
      </div>
    </div>
  );
}
