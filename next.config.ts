import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@multica/core", "@multica/ui", "@multica/views"],
  serverExternalPackages: ["node-pty", "simple-git", "better-sqlite3"],
  async rewrites() {
    const multicaApiUrl =
      process.env.MULTICA_API_URL || "http://localhost:8080";
    return [
      {
        source: "/multica-api/:path*",
        destination: `${multicaApiUrl}/api/:path*`,
      },
      {
        source: "/multica-auth/:path*",
        destination: `${multicaApiUrl}/auth/:path*`,
      },
    ];
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
