import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

const PORTRAIT_WIDTH = 1400;
const LANDSCAPE_WIDTH = 1850;

/** Full `puppeteer` bundles its own ~300MB Chromium download -- fine for
 * a local dev machine, but well past Vercel's ~250MB unzipped function
 * size limit, so every export route would fail to even deploy with it
 * as a real dependency. `puppeteer-core` (no bundled browser) plus
 * `@sparticuz/chromium` (a Chromium built and compressed specifically
 * to fit inside a serverless function) is the standard pairing for
 * exactly this. `puppeteer` itself stays a devDependency purely so this
 * function has *some* real Chromium binary to hand puppeteer-core's
 * launch() on a local machine, where @sparticuz/chromium's Linux-only
 * binary won't run at all (this app's own dev machine is macOS). */
async function resolveLaunchOptions(): Promise<{ executablePath: string; args: string[] }> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return { executablePath: await chromium.executablePath(), args: chromium.args };
  }
  const localPuppeteer = (await import("puppeteer")).default;
  return { executablePath: await localPuppeteer.executablePath(), args: ["--no-sandbox", "--disable-setuid-sandbox"] };
}

/** Prints a real `/print/...` page with a headless Chromium instead of
 * re-describing the page in a separate PDF-drawing library, so every
 * export using this is the actual screen (charts, Gantt bars, the
 * flight-plan spine, all of it) rather than a lookalike that can drift
 * out of sync with it. First built for delivery/projects/[ref]/pdf/
 * route.ts; pulled out here once a second, third and fourth export
 * route needed the exact same cookie-forwarding + launch + page.pdf()
 * sequence, so it isn't hand-copied any further. The caller's session
 * cookies are forwarded into the headless page so it loads the print
 * page authenticated as the same person who clicked Export, rather
 * than hitting the sign-in redirect.
 *
 * The PDF is sized to the page's own content, not a fixed A4 sheet:
 * a real /print/... page is a single continuous scroll (same as the
 * on-screen app), so forcing it into A4-height pages produced exactly
 * the two bugs a user reported from a real export -- a leftover
 * section spilling onto an almost-entirely-blank second page, and (via
 * page.pdf()'s own margin option, which Chromium leaves genuinely
 * blank rather than painting the page's own background into it) a
 * white border breaking the full-bleed branded look every other export
 * in this app has. Measuring the rendered height and asking for a PDF
 * exactly that size removes the page break instead of fighting it, and
 * margin: 0 lets the page's own background reach every edge -- the
 * page's own CSS padding (px-4 sm:px-7 py-5 sm:py-8, same as the real
 * route) is what gives it breathing room instead.
 * `landscape` widens the render itself (more columns actually reflow
 * into the extra room, since every print page's grid breakpoints are
 * real viewport-width media queries) rather than only swapping which
 * way a fixed A4 sheet is held. */
export async function renderPrintPagePdf(
  request: Request,
  printPath: string,
  filename: string,
  { landscape = false }: { landscape?: boolean } = {}
): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: requestUrl.origin };
    });

  const viewportWidth = landscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH;

  // Everything below, including the Chromium launch itself, is wrapped
  // in one try/catch: a route handler with no catch of its own left any
  // failure here (a launch failure on Vercel, a page.goto timeout, ...)
  // as an unhandled exception, which Next.js turns into an opaque 500
  // with no body -- ExportPdfButton already reads `body.error` from the
  // response on failure, but there was never a body to read, so a real
  // export bug just showed as "Export failed (500)." with nothing to
  // diagnose it by, on either end. Logging + returning the real message
  // here is what actually surfaces the underlying cause.
  let browser;
  try {
    const { executablePath, args } = await resolveLaunchOptions();
    browser = await puppeteer.launch({ headless: true, executablePath, args });
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: 1000 });
    if (cookies.length > 0) await page.setCookie(...cookies);

    const printUrl = `${requestUrl.origin}${printPath}`;
    const response = await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`Print page failed to load (status ${response?.status() ?? "unknown"}).`);
    }

    // +24px: a PDF page sized to the *exact* measured height sometimes
    // still forces one extra, almost-entirely-blank page for a stray
    // couple of pixels (verified locally) -- Chromium's own PDF layout
    // rounds slightly differently than the DOM measurement it's based
    // on. A small buffer costs nothing (it's absorbed into this page's
    // own background) and reliably keeps everything on one page.
    const contentHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight)) + 24;

    const buffer = await page.pdf({
      width: `${viewportWidth}px`,
      height: `${contentHeight}px`,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error(`PDF export failed for ${printPath}:`, err);
    return NextResponse.json({ error: `Export failed: ${message}` }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}

/** Reads `?orientation=landscape` off the incoming export request --
 * the one bit every ExportPdfButton with `allowOrientationChoice` sends. */
export function landscapeFromRequest(request: Request): boolean {
  return new URL(request.url).searchParams.get("orientation") === "landscape";
}
