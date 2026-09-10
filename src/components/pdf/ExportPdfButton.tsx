"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

function filenameFromResponse(res: Response, fallback: string): string {
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

function withOrientation(href: string, orientation: "portrait" | "landscape") {
  if (orientation === "portrait") return href;
  const url = new URL(href, "http://placeholder");
  url.searchParams.set("orientation", orientation);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/** Every CSV export button in the app builds its file client-side and
 * downloads instantly (see e.g. dashboard/ExportButton.tsx) — nothing to
 * wait on. A PDF export is different: it's rendered server-side, which
 * can genuinely take a moment (the Puppeteer-backed exports launch a
 * real headless browser), so a plain download link gives no feedback
 * while that request is in flight. This fetches explicitly instead of
 * just navigating to the route, so the button can show "Exporting…"
 * while it waits and "Downloaded" once the file lands, matching the
 * "Copied" flip pattern used elsewhere (e.g. PublishReportForm's
 * copy-link button) rather than leaving the click looking like it did
 * nothing. */
export function ExportPdfButton({
  href,
  fallbackFilename,
  label = "Export PDF",
  allowOrientationChoice = false,
}: {
  href: string;
  fallbackFilename: string;
  label?: string;
  /** Shows a Portrait/Landscape picker next to the button. Only
   * meaningful for exports rendered by printing a real page (the
   * Puppeteer-backed routes) -- @react-pdf/renderer-built documents lay
   * out fixed-width columns and don't benefit from a wider page. */
  allowOrientationChoice?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  async function handleExport() {
    setState("loading");
    setError(null);
    try {
      const target = allowOrientationChoice ? withOrientation(href, orientation) : href;
      const res = await fetch(target);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status}).`);
      }
      const blob = await res.blob();
      const filename = filenameFromResponse(res, fallbackFilename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {allowOrientationChoice ? (
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value === "landscape" ? "landscape" : "portrait")}
            disabled={state === "loading"}
            className="border border-line bg-white rounded-[9px] px-2 py-[9px] text-[11.5px] text-ink"
            aria-label="PDF orientation"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        ) : null}
        <Button variant="secondary" type="button" className="flex-none" disabled={state === "loading"} onClick={handleExport}>
          {state === "loading" ? "Exporting…" : state === "done" ? "Downloaded" : label}
        </Button>
      </div>
      {state === "error" && error ? <span className="text-[10.5px] text-block-fg leading-[1.4]">{error}</span> : null}
    </div>
  );
}
