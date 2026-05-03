import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { resolveCabinetDir } from "../src/lib/cabinets/server-paths";
import {
  invalidateCabinetOverviewCache,
  readCabinetOverview,
} from "../src/lib/cabinets/overview";
import { writeCabinetOptaleScope } from "../src/lib/optale/scope-registry";

test("cabinet overview includes Optale scope metadata for cabinets and agents", async () => {
  const cabinetPath = `__optale-overview-scope-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const childPath = `${cabinetPath}/child`;
  const cabinetDir = resolveCabinetDir(cabinetPath);
  const childDir = resolveCabinetDir(childPath);

  try {
    await fs.mkdir(path.join(cabinetDir, ".agents", "analyst"), {
      recursive: true,
    });
    await fs.mkdir(childDir, { recursive: true });
    await fs.writeFile(
      path.join(cabinetDir, ".cabinet"),
      [
        "schemaVersion: 1",
        "id: optale-overview-scope",
        "name: Optale Overview Scope",
        "kind: company",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(childDir, ".cabinet"),
      [
        "schemaVersion: 1",
        "id: optale-overview-scope-child",
        "name: Optale Overview Scope Child",
        "kind: child",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(cabinetDir, ".agents", "analyst", "persona.md"),
      [
        "---",
        "name: Analyst",
        "role: Scope checker",
        "---",
        "Scope checker",
        "",
      ].join("\n"),
    );
    await writeCabinetOptaleScope(cabinetPath, {
      scope: "personal",
      userId: "user-overview-scope",
      labels: ["overview"],
    });
    invalidateCabinetOverviewCache(cabinetPath);

    const overview = await readCabinetOverview(cabinetPath, {
      visibilityMode: "children-1",
    });

    assert.equal(overview.cabinet.optaleScope?.scope, "personal");
    assert.equal(overview.cabinet.optaleScope?.source, "explicit");
    assert.equal(overview.cabinet.optaleScope?.userId, "user-overview-scope");
    assert.equal(overview.children[0]?.optaleScope?.scope, "company");
    assert.equal(overview.visibleCabinets[0]?.optaleScope?.scope, "personal");
    assert.equal(overview.visibleCabinets[1]?.optaleScope?.scope, "company");
    assert.equal(overview.agents[0]?.optaleScope?.scope, "personal");
    assert.equal(overview.agents[0]?.optaleScope?.inheritedFromCabinet, true);
  } finally {
    invalidateCabinetOverviewCache(cabinetPath);
    await fs.rm(cabinetDir, { recursive: true, force: true });
  }
});
