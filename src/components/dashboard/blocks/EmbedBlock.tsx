import { isAllowedEmbedUrl } from "@/lib/dashboard/embed-allowlist";

export function EmbedBlock({ config }: { config: Record<string, unknown> }) {
  const url = typeof config.url === "string" ? config.url : "";

  if (!url || !isAllowedEmbedUrl(url)) {
    return (
      <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted text-center">
        No embed set, or its link isn&apos;t from an allowed source (YouTube, Vimeo, Loom, Figma, Google Docs/Calendar).
      </div>
    );
  }

  return <iframe src={url} className="w-full h-full rounded-[8px] border-0" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />;
}
