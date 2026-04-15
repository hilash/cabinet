import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@multica/core", "@multica/ui", "@multica/views"],
  serverExternalPackages: ["node-pty", "simple-git", "better-sqlite3"],
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 100,
  },
  turbopack: {
    root: __dirname,
  },
  outputFileTracingExcludes: {
    "/*": [
      ".next/dev/**/*",
      ".next/cache/**/*",
      ".git/**/*",
      ".github/**/*",
      ".claude/**/*",
      ".agents/**/*",
      "coverage/**/*",
      "out/**/*",
      "test/**/*",
      "**/.DS_Store",
    ],
  },
};

export default nextConfig;
