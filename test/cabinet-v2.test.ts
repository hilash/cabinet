import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import { discoverCabinetPathsSync } from "../src/lib/cabinets/discovery";
import { buildCabinetScopedId } from "../src/lib/cabinets/paths";
import { resolveCabinetDir } from "../src/lib/cabinets/server-paths";
import { readCabinetOverview } from "../src/lib/cabinets/overview";
import { createTask, getTasksForAgent } from "../src/lib/agents/task-inbox";
import {
  deleteAgentJob,
  loadAgentJobsBySlug,
  saveAgentJob,
} from "../src/lib/jobs/job-manager";
import type { JobConfig } from "../src/types/jobs";

// Self-contained company-cabinet fixture (the old hardcoded
// `example-text-your-mom` data was removed from the repo). Built under a
// unique top-level cabinet so discovery/overview have a known subtree to
// assert against, then cleaned up.
const FIX = `__cab-v2-fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function writeCabinetManifest(rel: string, name: string): Promise<void> {
  const dir = path.join(DATA_DIR, rel);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, ".cabinet"),
    [
      "schemaVersion: 1",
      `id: ${rel.replace(/[^a-zA-Z0-9]+/g, "-")}`,
      `name: ${name}`,
      "kind: child",
      "entry: index.md",
      "",
    ].join("\n"),
    "utf8"
  );
}

async function writeAgentPersona(rel: string, slug: string, name: string): Promise<void> {
  const dir = path.join(DATA_DIR, rel, ".agents", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "persona.md"),
    ["---", `name: ${name}`, "role: test agent", "active: true", "---", "", "Test agent.", ""].join("\n"),
    "utf8"
  );
}

before(async () => {
  await writeCabinetManifest(FIX, "Test Co");
  for (const slug of ["ceo", "cfo", "coo", "cto"]) {
    await writeAgentPersona(FIX, slug, slug.toUpperCase());
  }
  await writeCabinetManifest(`${FIX}/app-development`, "App Development");
  // Distinct slug (not "cto") so it isn't merged with the root cabinet's cto
  // when visibility expands — lets us assert the descendant's own scopedId.
  await writeAgentPersona(`${FIX}/app-development`, "architect", "Architect");
  await writeCabinetManifest(`${FIX}/marketing/tiktok`, "TikTok");
  await writeAgentPersona(`${FIX}/marketing/tiktok`, "trend-scout", "Trend Scout");
  await writeCabinetManifest(`${FIX}/marketing/reddit`, "Reddit");
  const now = new Date().toISOString();
  await saveAgentJob(
    "trend-scout",
    {
      id: "daily-trend-scan",
      name: "Daily Trend Scan",
      enabled: true,
      schedule: "0 9 * * *",
      provider: "claude-code",
      ownerAgent: "trend-scout",
      prompt: "Scan trends.",
      createdAt: now,
      updatedAt: now,
      cabinetPath: `${FIX}/marketing/tiktok`,
    } satisfies JobConfig,
    `${FIX}/marketing/tiktok`
  );
});

after(async () => {
  await fs.rm(path.join(DATA_DIR, FIX), { recursive: true, force: true });
});

test("cabinet discovery includes the root cabinet and nested example cabinets", () => {
  const cabinetPaths = discoverCabinetPathsSync();

  assert.ok(cabinetPaths.includes("."), "expected the real root cabinet path '.'");
  assert.ok(cabinetPaths.includes(FIX), "expected the company cabinet");
  assert.ok(
    cabinetPaths.includes(`${FIX}/marketing/tiktok`),
    "expected the nested TikTok cabinet"
  );
  assert.ok(
    cabinetPaths.includes(`${FIX}/marketing/reddit`),
    "expected the nested Reddit cabinet"
  );
  assert.ok(
    cabinetPaths.includes(`${FIX}/app-development`),
    "expected the nested app development cabinet"
  );
});

test("cabinet overview keeps own scope separate from descendant scope", async () => {
  const ownOverview = await readCabinetOverview(FIX, { visibilityMode: "own" });
  const expandedOverview = await readCabinetOverview(FIX, {
    visibilityMode: "children-2",
  });

  assert.equal(ownOverview.parent?.path, ".");
  const ownChildPaths = ownOverview.children.map((child) => child.path).sort();
  for (const requiredChild of [
    `${FIX}/app-development`,
    `${FIX}/marketing/reddit`,
    `${FIX}/marketing/tiktok`,
  ]) {
    assert.ok(
      ownChildPaths.includes(requiredChild),
      `expected child cabinet ${requiredChild} to be present`
    );
  }

  // Own visibility must include this cabinet's own agents and exclude
  // descendant agents. (Global `.global-agents/*` agents intentionally appear
  // in every cabinet, so assert a subset rather than exact equality.)
  const ownAgentSlugs = ownOverview.agents.map((agent) => agent.slug);
  for (const slug of ["ceo", "cfo", "coo", "cto"]) {
    assert.ok(ownAgentSlugs.includes(slug), `expected own agent ${slug}`);
  }
  assert.ok(
    !ownAgentSlugs.includes("trend-scout"),
    "own visibility should not include descendant cabinet agents"
  );

  const expandedScopedIds = expandedOverview.agents.map((agent) => agent.scopedId);
  assert.ok(
    expandedScopedIds.includes(buildCabinetScopedId(FIX, "agent", "cto")),
    "expected the root cabinet CTO scoped id"
  );
  assert.ok(
    expandedScopedIds.includes(
      buildCabinetScopedId(`${FIX}/app-development`, "agent", "architect")
    ),
    "expected the child cabinet architect scoped id"
  );
  assert.ok(
    expandedOverview.agents.some(
      (agent) =>
        agent.slug === "trend-scout" &&
        agent.cabinetPath === `${FIX}/marketing/tiktok`
    ),
    "expected descendant cabinet agents to appear when visibility expands"
  );
  assert.ok(
    expandedOverview.jobs.some(
      (job) =>
        job.id === "daily-trend-scan" &&
        job.cabinetPath === `${FIX}/marketing/tiktok`
    ),
    "expected descendant cabinet jobs to appear when visibility expands"
  );
});

test("job manager reads and writes only cabinet-level .jobs files", async () => {
  const cabinetPath = `__cabinet-v2-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cabinetDir = resolveCabinetDir(cabinetPath);
  const jobId = "daily-digest";
  const jobFile = path.join(cabinetDir, ".jobs", `${jobId}.yaml`);
  const legacyAgentJobsDir = path.join(cabinetDir, ".agents", "analyst", "jobs");

  try {
    await fs.mkdir(path.join(cabinetDir, ".agents", "analyst"), { recursive: true });
    await fs.writeFile(
      path.join(cabinetDir, ".cabinet"),
      [
        "schemaVersion: 1",
        "id: cabinet-v2-test",
        "name: Cabinet V2 Test",
        "kind: child",
        "entry: index.md",
        "",
      ].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(cabinetDir, ".agents", "analyst", "persona.md"),
      [
        "---",
        "name: Analyst",
        "role: Keeps the test cabinet honest",
        "active: true",
        "heartbeat: 0 9 * * 1-5",
        "---",
        "",
        "You are the test analyst.",
        "",
      ].join("\n"),
      "utf8"
    );

    const now = new Date().toISOString();
    const savedJob = await saveAgentJob(
      "analyst",
      {
        id: jobId,
        name: "Daily Digest",
        enabled: true,
        schedule: "0 9 * * 1-5",
        provider: "claude-code",
        ownerAgent: "analyst",
        prompt: "Write the daily digest.",
        createdAt: now,
        updatedAt: now,
        cabinetPath,
      } satisfies JobConfig,
      cabinetPath
    );

    assert.equal(savedJob.id, jobId);
    await fs.access(jobFile);
    await assert.rejects(fs.access(legacyAgentJobsDir));

    const jobs = await loadAgentJobsBySlug("analyst", cabinetPath);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.ownerAgent, "analyst");
    assert.equal(jobs[0]?.cabinetPath, cabinetPath);

    await deleteAgentJob("analyst", jobId, cabinetPath);
    await assert.rejects(fs.access(jobFile));
  } finally {
    await fs.rm(path.join(DATA_DIR, cabinetPath), { recursive: true, force: true });
  }
});

test("task inbox stores handoffs inside the owning cabinet", async () => {
  const cabinetPath = `__cabinet-v2-task-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cabinetDir = resolveCabinetDir(cabinetPath);
  const taskDir = path.join(cabinetDir, ".agents", "analyst", "tasks");
  const rootTaskDir = path.join(DATA_DIR, ".agents", "analyst", "tasks");

  try {
    await fs.mkdir(path.join(cabinetDir, ".agents", "analyst"), { recursive: true });
    await fs.writeFile(
      path.join(cabinetDir, ".cabinet"),
      [
        "schemaVersion: 1",
        "id: cabinet-v2-task-test",
        "name: Cabinet V2 Task Test",
        "kind: child",
        "entry: index.md",
        "",
      ].join("\n"),
      "utf8"
    );

    const task = await createTask({
      fromAgent: "ceo",
      toAgent: "analyst",
      title: "Review launch copy",
      description: "Check the launch message for clarity.",
      kbRefs: [],
      priority: 2,
      cabinetPath,
    });

    assert.equal(task.cabinetPath, cabinetPath);
    await fs.access(path.join(taskDir, `${task.id}.json`));
    await assert.rejects(fs.access(path.join(rootTaskDir, `${task.id}.json`)));

    const tasks = await getTasksForAgent("analyst", "pending", cabinetPath);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0]?.title, "Review launch copy");
    assert.equal(tasks[0]?.cabinetPath, cabinetPath);
  } finally {
    await fs.rm(path.join(DATA_DIR, cabinetPath), { recursive: true, force: true });
  }
});
