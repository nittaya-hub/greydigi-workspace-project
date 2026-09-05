import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
      <div className="bg-white border border-line rounded-[12px] max-w-[420px] w-full py-11 px-6 flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[9.5px] text-muted">404</span>
        <span className="font-display font-extrabold text-[18px] text-ink">This record does not exist.</span>
        <span className="text-[11.5px] text-muted max-w-[46ch] leading-[1.55]">
          It was never created, or the link came from a share link that has since been revoked.
        </span>
        <Link href="/" className="mt-2 border border-line rounded-[9px] px-[13px] py-[9px] text-[11.5px] text-ink">
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
