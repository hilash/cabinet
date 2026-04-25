import { NextResponse } from "next/server";

/**
 * GET /api/agents/skills/catalog
 *
 * Server-side proxy for the skills.sh catalog. Caches responses in-memory
 * with TTLs from docs/SKILLS_PLAN.md Decisions §5: 1h listings, 24h details.
 *
 * Note: skills.sh doesn't currently expose a documented JSON API at a stable
 * path, so this proxy currently fetches the GitHub repo metadata directly
 * for individual skills (`?owner=&repo=[&skill=]`) and returns curated stub
 * data for browsing. Phase 4 polish should replace the stub with a real
 * scrape/feed once skills.sh stabilizes its public API.
 */

interface CatalogQuery {
  owner?: string;
  repo?: string;
  skill?: string;
  q?: string;
  sort?: "trending" | "hot" | "all-time";
}

interface CachedEntry<T> {
  expiresAt: number;
  data: T;
}

const detailCache = new Map<string, CachedEntry<unknown>>();
const listingCache = new Map<string, CachedEntry<unknown>>();

const LISTING_TTL_MS = 60 * 60 * 1000; // 1h
const DETAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getCached<T>(map: Map<string, CachedEntry<unknown>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(map: Map<string, CachedEntry<unknown>>, key: string, data: T, ttl: number) {
  map.set(key, { expiresAt: Date.now() + ttl, data });
}

interface RepoMeta {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  lastCommitISO: string | null;
  lastCommitAgeDays: number | null;
  defaultBranch: string;
  description: string | null;
  topics: string[];
}

async function fetchGitHubRepo(owner: string, repo: string): Promise<RepoMeta | null> {
  const cacheKey = `repo:${owner}/${repo}`;
  const cached = getCached<RepoMeta>(detailCache, cacheKey);
  if (cached) return cached;

  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "cabinet-skills-catalog",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;

  const pushedAt = typeof data.pushed_at === "string" ? data.pushed_at : null;
  const lastCommitAgeDays = pushedAt
    ? Math.floor((Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const meta: RepoMeta = {
    owner,
    repo,
    stars: typeof data.stargazers_count === "number" ? data.stargazers_count : 0,
    forks: typeof data.forks_count === "number" ? data.forks_count : 0,
    lastCommitISO: pushedAt,
    lastCommitAgeDays,
    defaultBranch: typeof data.default_branch === "string" ? data.default_branch : "main",
    description: typeof data.description === "string" ? data.description : null,
    topics: Array.isArray(data.topics) ? (data.topics as string[]) : [],
  };
  setCached(detailCache, cacheKey, meta, DETAIL_TTL_MS);
  return meta;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q: CatalogQuery = {
    owner: url.searchParams.get("owner") || undefined,
    repo: url.searchParams.get("repo") || undefined,
    skill: url.searchParams.get("skill") || undefined,
    q: url.searchParams.get("q") || undefined,
    sort: (url.searchParams.get("sort") as CatalogQuery["sort"]) || "trending",
  };

  // Detail mode — owner+repo (+ optional skill name) supplied.
  if (q.owner && q.repo) {
    const meta = await fetchGitHubRepo(q.owner, q.repo);
    if (!meta) {
      return NextResponse.json(
        { error: `couldn't fetch ${q.owner}/${q.repo}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ mode: "detail", skill: meta, requestedSkill: q.skill ?? null });
  }

  // Listing mode — currently a stub of well-known publishers / curated picks.
  // Phase 4 polish: replace with real skills.sh feed once their API stabilizes.
  const listingKey = `listing:${q.sort}:${q.q ?? ""}`;
  const cached = getCached<unknown>(listingCache, listingKey);
  if (cached) {
    return NextResponse.json({ mode: "listing", source: "cache", data: cached });
  }
  const stub = {
    note: "skills.sh public API not yet stable — listing is a curated fallback.",
    featured: [
      { owner: "anthropics", repo: "skills", verified: true },
      { owner: "vercel-labs", repo: "skills", verified: true },
      { owner: "shadcn-ui", repo: "skills", verified: true },
    ],
    sort: q.sort,
    query: q.q ?? null,
  };
  setCached(listingCache, listingKey, stub, LISTING_TTL_MS);
  return NextResponse.json({ mode: "listing", source: "fresh", data: stub });
}
