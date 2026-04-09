import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["node-pty", "simple-git", "better-sqlite3", "better-auth"],
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
