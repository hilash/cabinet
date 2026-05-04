import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInternalOptaleMcpGatewayContext,
} from "@/lib/optale/mcp-gateway";
import {
  commandCenterRestrictedDenial,
  isCommandCenterActionAllowedInRestrictedCustomerMode,
  restrictedAgentRuntimeDenial,
  restrictedAllowedAdapterTypes,
  restrictedCustomerVisibilityMode,
} from "./restricted-customer-mode";
import {
  getOptaleRuntimeMode,
  isOptaleRestrictedCustomerMode,
} from "./runtime-mode";
import {
  getOptaleCapabilityProfile,
  hasOptaleCapability,
} from "./capabilities";

const CLEAN_RUNTIME_ENV = {
  OPTALE_RUNTIME_MODE: undefined,
  NEXT_PUBLIC_OPTALE_RUNTIME_MODE: undefined,
  OPTALE_CUSTOMER_MODE: undefined,
  NEXT_PUBLIC_OPTALE_CUSTOMER_MODE: undefined,
  OPTALE_DESKTOP_PROFILE: undefined,
  NEXT_PUBLIC_OPTALE_DESKTOP_PROFILE: undefined,
};

function withEnv<T>(
  updates: Record<string, string | undefined>,
  fn: () => T,
): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(updates)) {
    previous[key] = process.env[key];
    if (updates[key] === undefined) delete process.env[key];
    else process.env[key] = updates[key];
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("restricted customer mode can be enabled by either runtime env", () => {
  assert.equal(
    withEnv(
      { ...CLEAN_RUNTIME_ENV, OPTALE_RUNTIME_MODE: "restricted_customer" },
      () => isOptaleRestrictedCustomerMode(),
    ),
    true,
  );
  assert.equal(
    withEnv(
      { ...CLEAN_RUNTIME_ENV, OPTALE_CUSTOMER_MODE: "restricted" },
      () => getOptaleRuntimeMode(),
    ),
    "restricted_customer",
  );
  assert.equal(
    withEnv(
      { ...CLEAN_RUNTIME_ENV, OPTALE_DESKTOP_PROFILE: "partner" },
      () => getOptaleRuntimeMode(),
    ),
    "restricted_customer",
  );
  assert.equal(
    withEnv(
      { ...CLEAN_RUNTIME_ENV, NEXT_PUBLIC_OPTALE_RUNTIME_MODE: "restricted_customer" },
      () => getOptaleRuntimeMode(),
    ),
    "restricted_customer",
  );
  assert.equal(
    withEnv(
      CLEAN_RUNTIME_ENV,
      () => getOptaleRuntimeMode(),
    ),
    "operator",
  );
});

test("desktop capability profile separates operator and partner memory lanes", () => {
  withEnv(CLEAN_RUNTIME_ENV, () => {
    const profile = getOptaleCapabilityProfile();
    assert.equal(profile.mode, "operator");
    assert.equal(profile.memoryLane, "operator_company_brain");
    assert.equal(hasOptaleCapability("terminal.open"), true);
    assert.equal(hasOptaleCapability("company_brain.view"), true);
    assert.equal(hasOptaleCapability("memory.cross_tenant"), true);
  });

  withEnv({ ...CLEAN_RUNTIME_ENV, OPTALE_DESKTOP_PROFILE: "partner" }, () => {
    const profile = getOptaleCapabilityProfile();
    assert.equal(profile.mode, "restricted_customer");
    assert.equal(profile.memoryLane, "partner_scoped_memory");
    assert.equal(hasOptaleCapability("terminal.open"), false);
    assert.equal(hasOptaleCapability("terminal.runtime"), false);
    assert.equal(hasOptaleCapability("providers.configure"), false);
    assert.equal(hasOptaleCapability("company_brain.view"), false);
    assert.equal(hasOptaleCapability("memory.cross_tenant"), false);
  });
});

test("restricted customer mode only allows review_actions in Command Center", () => {
  withEnv({ OPTALE_CUSTOMER_MODE: "restricted" }, () => {
    assert.equal(
      isCommandCenterActionAllowedInRestrictedCustomerMode("review_actions"),
      true,
    );
    assert.equal(
      isCommandCenterActionAllowedInRestrictedCustomerMode("launch_conversation"),
      false,
    );
    assert.equal(
      commandCenterRestrictedDenial("run_job")?.code,
      "restricted_customer_command_center_action",
    );
  });
});

test("restricted customer mode clamps broad read visibility to own scope", () => {
  withEnv(CLEAN_RUNTIME_ENV, () => {
    assert.equal(restrictedCustomerVisibilityMode("all"), "all");
    assert.equal(restrictedCustomerVisibilityMode("children-2"), "children-2");
    assert.equal(restrictedCustomerVisibilityMode(undefined), "own");
  });

  withEnv({ ...CLEAN_RUNTIME_ENV, OPTALE_DESKTOP_PROFILE: "partner" }, () => {
    assert.equal(restrictedCustomerVisibilityMode("all"), "own");
    assert.equal(restrictedCustomerVisibilityMode("children-2"), "own");
    assert.equal(restrictedCustomerVisibilityMode("children-1"), "own");
    assert.equal(restrictedCustomerVisibilityMode("own"), "own");
    assert.equal(restrictedCustomerVisibilityMode(undefined), "own");
  });
});

test("restricted customer mode allows only configured safe agent adapters", () => {
  withEnv({ OPTALE_CUSTOMER_MODE: "restricted" }, () => {
    assert.deepEqual([...restrictedAllowedAdapterTypes()], ["openrouter_api"]);
    assert.equal(
      restrictedAgentRuntimeDenial({ adapterType: "openrouter_api" }),
      null,
    );
    assert.equal(
      restrictedAgentRuntimeDenial({ adapterType: "codex_local" })?.code,
      "restricted_customer_adapter_not_allowed",
    );
    assert.equal(
      restrictedAgentRuntimeDenial({ adapterType: "codex_cli_legacy" })?.code,
      "restricted_customer_shell_or_legacy_adapter",
    );
    assert.equal(
      restrictedAgentRuntimeDenial({ runtimeMode: "terminal" })?.code,
      "restricted_customer_terminal_runtime",
    );
  });
});

test("restricted customer mode supports explicit safe adapter allowlist override", () => {
  withEnv(
    {
      OPTALE_CUSTOMER_MODE: "restricted",
      OPTALE_RESTRICTED_ALLOWED_ADAPTERS: "openrouter_api,mock_api",
    },
    () => {
      assert.deepEqual(
        [...restrictedAllowedAdapterTypes()].sort(),
        ["mock_api", "openrouter_api"],
      );
      assert.equal(restrictedAgentRuntimeDenial({ adapterType: "mock_api" }), null);
    },
  );
});

test("restricted customer mode makes internal MCP gateway contexts read-only", () => {
  withEnv(
    { OPTALE_CUSTOMER_MODE: "restricted", OPTALE_MCP_ENABLE_ACTIONS: "true" },
    () => {
      const context = buildInternalOptaleMcpGatewayContext({
        clientId: "openrouter-api",
        permissions: ["read", "write", "execute"],
        canUseActions: true,
      });
      assert.deepEqual(context.permissions, ["read"]);
      assert.equal(context.canUseActions, false);
    },
  );
});
