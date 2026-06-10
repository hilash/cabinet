import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureCabinetPrefixedPagePath,
  ROOT_CABINET_PATH,
} from "@/lib/cabinets/paths";

test("ensureCabinetPrefixedPagePath prepends the board for a board-less path", () => {
  assert.equal(
    ensureCabinetPrefixedPagePath("zeropoint-capital", "kb/reports/foo"),
    "zeropoint-capital/kb/reports/foo"
  );
});

test("ensureCabinetPrefixedPagePath leaves an already-board-prefixed path unchanged", () => {
  assert.equal(
    ensureCabinetPrefixedPagePath(
      "zeropoint-capital",
      "zeropoint-capital/kb/reports/foo"
    ),
    "zeropoint-capital/kb/reports/foo"
  );
});

test("ensureCabinetPrefixedPagePath is a no-op for the root cabinet", () => {
  assert.equal(
    ensureCabinetPrefixedPagePath(ROOT_CABINET_PATH, "kb/reports/foo"),
    "kb/reports/foo"
  );
});

test("ensureCabinetPrefixedPagePath is a no-op when cabinetPath is undefined", () => {
  assert.equal(
    ensureCabinetPrefixedPagePath(undefined, "kb/reports/foo"),
    "kb/reports/foo"
  );
});

test("ensureCabinetPrefixedPagePath does not prefix the board's own root page", () => {
  assert.equal(
    ensureCabinetPrefixedPagePath("zeropoint-capital", "zeropoint-capital"),
    "zeropoint-capital"
  );
});

test("ensureCabinetPrefixedPagePath leaves an empty page path empty", () => {
  assert.equal(ensureCabinetPrefixedPagePath("zeropoint-capital", ""), "");
});
