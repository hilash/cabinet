import { createGetHandler } from "@/lib/http/create-handler";

const GITHUB_API_URL = "https://api.github.com/repos/hilash/cabinet";
const GITHUB_REPO_URL = "https://github.com/hilash/cabinet";
const GITHUB_STARS_FALLBACK = 244;
const CACHE_TTL_MS = 30 * 60 * 1000;

export const dynamic = "force-dynamic";

let cachedRepo: { stars: number; url: string } | null = null;
let cachedAt = 0;

export const GET = createGetHandler({
  handler: async () => {
    const now = Date.now();
    if (cachedRepo && now - cachedAt < CACHE_TTL_MS) {
      return cachedRepo;
    }

    try {
      const res = await fetch(GITHUB_API_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "cabinet-app",
        },
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}`);
      }

      const data = await res.json();
      const payload = {
        stars:
          typeof data.stargazers_count === "number"
            ? data.stargazers_count
            : GITHUB_STARS_FALLBACK,
        url: typeof data.html_url === "string" ? data.html_url : GITHUB_REPO_URL,
      };
      cachedRepo = payload;
      cachedAt = now;
      return payload;
    } catch {
      if (cachedRepo) {
        return cachedRepo;
      }

      return {
        stars: GITHUB_STARS_FALLBACK,
        url: GITHUB_REPO_URL,
      };
    }
  },
});
