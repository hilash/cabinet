import type { NextConfig } from "next";

const outputTraceExcludes = [
  ".next/dev/**/*",
  ".next/cache/**/*",
  ".git/**/*",
  ".github/**/*",
  ".claude/**/*",
  ".agents/**/*",
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "coverage/**/*",
  "data/**/*",
  "docs/**/*",
  "Dockerfile",
  "out/**/*",
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "test/**/*",
  "**/.DS_Store",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.loca.lt",
    "*.trycloudflare.com",
    "observatory.optale.com",
    "cabinet.optale.com",
  ],
  compiler: {
    removeConsole: {
      exclude: ["error", "warn"],
    },
  },
  output: "standalone",
  // Audit #219 / #220: the floating Next.js dev indicator sat on top of the
  // sidebar "New Page" button and was visible in the product chrome even in
  // dev. Disable it entirely — actual Next.js compile errors still surface
  // via the terminal and the error overlay.
  devIndicators: false,
  serverExternalPackages: ["node-pty", "simple-git", "better-sqlite3"],
  outputFileTracingExcludes: {
    "/*": outputTraceExcludes,
    "/instrumentation": outputTraceExcludes,
  },
};

export default nextConfig;
