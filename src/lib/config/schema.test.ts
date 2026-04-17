import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CABINET_CONFIG,
  parseCabinetConfig,
} from "./schema";

test("parseCabinetConfig accepts a valid CabinetConfig", () => {
  const parsed = parseCabinetConfig({
    ...DEFAULT_CABINET_CONFIG,
    schedules: [
      {
        id: "weekday-health",
        name: "Weekday health",
        schedule: "0 9 * * 1-5",
        enabled: true,
      },
    ],
    runtime: {
      personas: {
        ceo: {
          provider: "codex-cli",
          heartbeat: "0 9 * * 1-5",
          active: true,
          workdir: "/data",
          workspace: "/",
          setupComplete: true,
          multicaRuntimeId: "runtime-123",
        },
      },
    },
  });

  assert.equal(parsed.version, 1);
  assert.equal(parsed.runtime.personas.ceo?.multicaRuntimeId, "runtime-123");
  assert.equal(parsed.schedules[0]?.schedule, "0 9 * * 1-5");
});

test("parseCabinetConfig rejects missing version and invalid field types", () => {
  assert.throws(
    () => parseCabinetConfig({
      integrations: DEFAULT_CABINET_CONFIG.integrations,
      schedules: [],
      runtime: { personas: {} },
    }),
    /version/i,
  );

  assert.throws(
    () => parseCabinetConfig({
      ...DEFAULT_CABINET_CONFIG,
      integrations: {
        ...DEFAULT_CABINET_CONFIG.integrations,
        notifications: {
          ...DEFAULT_CABINET_CONFIG.integrations.notifications,
          telegram: {
            ...DEFAULT_CABINET_CONFIG.integrations.notifications.telegram,
            enabled: "yes",
          },
        },
      },
    }),
    /enabled/i,
  );
});

test("DEFAULT_CABINET_CONFIG roundtrips through JSON serialization", () => {
  const roundtripped = parseCabinetConfig(
    JSON.parse(JSON.stringify(DEFAULT_CABINET_CONFIG)),
  );

  assert.deepEqual(roundtripped, DEFAULT_CABINET_CONFIG);
});
