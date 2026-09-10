import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium is already in Next's own default external-
  // packages list, so it was never being bundled into a JS chunk -- the
  // real gap is output file tracing (@vercel/nft), which decides what
  // gets copied into the deployed function by statically following
  // import/require/fs calls. It has no way to see that
  // chromium.executablePath() needs the *.br binaries under bin/ (they
  // aren't reached by any traceable require), so it silently drops that
  // whole folder. Confirmed in production logs: "The input directory
  // '/var/task/node_modules/@sparticuz/chromium/bin' does not exist."
  // outputFileTracingIncludes force-includes it regardless of what
  // static tracing finds -- same fix Next's own docs give for the
  // identical problem with aws-crt/sharp's native binaries.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/*": ["node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
