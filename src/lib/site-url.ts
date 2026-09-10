/** The stable, canonical domain to build absolute client-facing links
 * from (Copy Link buttons, P·1 share links) -- deliberately NOT
 * `window.location.origin` alone, which reflects whatever host the
 * admin currently happens to be browsing from. Vercel gives every
 * deployment its own throwaway preview-hash domain in addition to the
 * one stable production domain; an admin who clicks Copy Link while
 * browsing a preview URL (e.g. right after opening a fresh deployment
 * from the Vercel dashboard) would otherwise hand a client a link on a
 * domain that requires being logged into Vercel to view at all --
 * confirmed live: preview domains gate behind Vercel Authentication
 * regardless of this project's own Deployment Protection settings.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel (Project Settings -> Environment
 * Variables, all environments) to the real production domain (e.g.
 * https://greydigi-workspace-project.vercel.app, or a custom domain
 * once one exists) to make every Copy Link button always produce a
 * working link regardless of which domain the admin is on right now.
 * Unset, this falls back to `window.location.origin` -- the previous,
 * only behavior -- so this is a pure opt-in improvement. */
export function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return typeof window !== "undefined" ? window.location.origin : null;
}
