import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium resolves its bundled binary from a path relative
  // to its own package folder at runtime (chromium.executablePath()).
  // Left to the default bundler behavior, Next relocates the package
  // into the compiled server output and that relative lookup breaks --
  // confirmed in production logs: "The input directory
  // '/var/task/node_modules/@sparticuz/chromium/bin' does not exist."
  // Marking it (and puppeteer-core, which launches it) external keeps
  // both as plain node_modules requires that Next's output file tracing
  // copies in as-is, so the binary sits where the package expects it.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
