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
  // Profile photos live in the public `avatars` Storage bucket, served
  // straight from Supabase's own CDN domain -- next/image refuses any
  // external host it doesn't know about, so this is the one config
  // change a real avatar_url needs to actually render.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // "Delivery" -> "Missions" and "Product" -> "Hangar" (aironauts Decision
  // Pack, "Four cockpits and one brain"). Old bookmarks/links into either
  // space should keep working rather than 404 once the routes move.
  async redirects() {
    return [
      { source: "/delivery", destination: "/missions", permanent: true },
      { source: "/delivery/:path*", destination: "/missions/:path*", permanent: true },
      { source: "/product", destination: "/hangar", permanent: true },
      { source: "/product/:path*", destination: "/hangar/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
