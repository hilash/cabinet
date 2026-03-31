import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["node-pty", "simple-git", "better-sqlite3"],
};

export default nextConfig;
