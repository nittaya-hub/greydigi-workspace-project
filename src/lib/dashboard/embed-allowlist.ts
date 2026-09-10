/** Embed blocks render an <iframe> — never raw HTML/script, per the
 * "bounded block library" requirement. To keep that boundary meaningful
 * even if a bad config value ever reaches the render path, the src is
 * checked against this fixed host allow-list both when an admin saves the
 * config and again right before rendering. */
export const EMBED_ALLOWED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.loom.com",
  "www.figma.com",
  "docs.google.com",
  "calendar.google.com",
];

export function isAllowedEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && EMBED_ALLOWED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
