import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

type RouteGet = (request: NextRequest) => Promise<Response>;

let tempRoot: string;
const originalEnv: Record<string, string | undefined> = {};

function setIsolatedEnv(name: string, value?: string): void {
  originalEnv[name] = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function requestFor(route: string): NextRequest {
  return new NextRequest(
    `http://localhost${route}?cabinetPath=.&visibilityMode=all&limit=20`,
  );
}

async function seedCabinetRoot(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, ".cabinet"),
    [
      "schemaVersion: 1",
      "id: optale-route-visibility-test",
      "name: Optale Route Visibility Test",
      "kind: root",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.mkdir(path.join(root, ".agents", "reviewer"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".agents", "reviewer", "persona.md"),
    [
      "---",
      "name: Reviewer",
      "role: Route visibility reviewer",
      "provider: openrouter",
      "active: true",
      "setupComplete: true",
      "---",
      "Reviewer persona.",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.mkdir(path.join(root, ".cabinet-state", "optale-mcp"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, ".cabinet-state", "optale-mcp", "clients.json"),
    `${JSON.stringify({ version: 1, clients: [] }, null, 2)}\n`,
    "utf8",
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  assert.equal(response.status, 200);
  return (await response.json()) as Record<string, unknown>;
}

before(async () => {
  tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "optale-read-route-visibility-test-"),
  );
  setIsolatedEnv("CABINET_DATA_DIR", tempRoot);
  setIsolatedEnv("KB_PASSWORD");
  setIsolatedEnv("OPTALE_CUSTOMER_MODE");
  setIsolatedEnv("OPTALE_RUNTIME_MODE");
  setIsolatedEnv("NEXT_PUBLIC_OPTALE_RUNTIME_MODE");
  setIsolatedEnv("OPTALE_DESKTOP_PROFILE");
  setIsolatedEnv("NEXT_PUBLIC_OPTALE_DESKTOP_PROFILE");
  await seedCabinetRoot(tempRoot);
});

after(async () => {
  if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

async function readRoutes(): Promise<Array<{ route: string; get: RouteGet }>> {
  const [
    commandCenter,
    resources,
    actions,
    actionRuns,
    policyDecisions,
    lineageEdges,
    auditEvents,
  ] = await Promise.all([
    import("./command-center/route"),
    import("./resources/route"),
    import("./actions/route"),
    import("./action-runs/route"),
    import("./policy-decisions/route"),
    import("./lineage-edges/route"),
    import("./audit-events/route"),
  ]);

  return [
    { route: "/api/optale/command-center", get: commandCenter.GET },
    { route: "/api/optale/resources", get: resources.GET },
    { route: "/api/optale/actions", get: actions.GET },
    { route: "/api/optale/action-runs", get: actionRuns.GET },
    { route: "/api/optale/policy-decisions", get: policyDecisions.GET },
    { route: "/api/optale/lineage-edges", get: lineageEdges.GET },
    { route: "/api/optale/audit-events", get: auditEvents.GET },
  ];
}

test("operator Optale read routes preserve requested broad visibility", async () => {
  delete process.env.OPTALE_CUSTOMER_MODE;
  delete process.env.OPTALE_DESKTOP_PROFILE;

  for (const route of await readRoutes()) {
    const body = await readJson(await route.get(requestFor(route.route)));
    assert.equal(body.visibilityMode, "all", route.route);
  }
});

test("restricted customer Optale read routes clamp broad visibility server-side", async () => {
  process.env.OPTALE_DESKTOP_PROFILE = "partner";

  for (const route of await readRoutes()) {
    const body = await readJson(await route.get(requestFor(route.route)));
    assert.equal(body.visibilityMode, "own", route.route);
  }

  const commandCenter = await import("./command-center/route");
  const snapshot = await readJson(
    await commandCenter.GET(requestFor("/api/optale/command-center")),
  );
  assert.deepEqual(snapshot.controls, ["review_actions"]);
  assert.ok(
    Array.isArray(snapshot.operatorOnlyControls) &&
      snapshot.operatorOnlyControls.includes("launch_conversation"),
  );
});
