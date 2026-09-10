/** Renders with a plain <img>, not next/image: the url may be a data:
 * URL (uploaded, base64) as well as a remote https URL, and next/image
 * requires a static domain allow-list that a client-configurable image
 * block can't satisfy. */
export function ImageBlock({ config }: { config: Record<string, unknown> }) {
  const url = typeof config.url === "string" ? config.url : "";
  const alt = typeof config.alt === "string" ? config.alt : "";

  if (!url) {
    return (
      <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted">
        No image set.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="w-full h-full object-cover rounded-[8px]" />
  );
}
