# Optale Restricted Customer Mode

Restricted customer mode is the partner/customer capability profile for Optale Command desktop pilots. It is not intended for Optale operator or builder work.

Enable it with any of these private runtime flags:

```bash
OPTALE_RUNTIME_MODE=restricted_customer
# or
OPTALE_CUSTOMER_MODE=restricted
# or
OPTALE_DESKTOP_PROFILE=partner
```

For partner desktop builds, set the matching public flags at build time so the packaged client UI also hides operator surfaces:

```bash
NEXT_PUBLIC_OPTALE_RUNTIME_MODE=restricted_customer
NEXT_PUBLIC_OPTALE_DESKTOP_PROFILE=partner
```

Optional adapter allowlist:

```bash
OPTALE_RESTRICTED_ALLOWED_ADAPTERS=openrouter_api
```

## Capability Profile

Operator mode is the default. It keeps the full Optale operator lane:

- terminal open and terminal-backed runtimes;
- provider/runtime configuration;
- secret and storage settings;
- raw diagnostics;
- Company Brain and cross-tenant/operator memory;
- MCP/client/policy mutation and update controls.

Restricted customer mode uses the partner workspace lane:

- personal memory plus scoped partner/customer workspace memory;
- no Optale-private Company Brain or Thor-private memory;
- no cross-tenant memory;
- no unrestricted local terminal or shell runtime;
- no provider credentials/configuration surface;
- no raw daemon diagnostics or internal secret routing UI.

## Behavior

When enabled, restricted customer mode:

- blocks raw daemon token exposure through `/api/daemon/auth`;
- blocks raw daemon session diagnostics;
- blocks headless one-shot provider execution;
- blocks direct legacy agent runs;
- blocks terminal/PTY, shell, and legacy adapter runtimes;
- blocks local terminal open requests;
- allows only explicitly allowlisted agent adapters, defaulting to `openrouter_api`;
- blocks provider configuration and provider verification routes;
- blocks Command Center admin actions except `review_actions`;
- blocks MCP policy and MCP client mutations;
- forces internal MCP gateway contexts to read-only and disables MCP action tools;
- blocks background job create/update/run/delete routes;
- blocks agent persona, heartbeat, memory, and inbox mutation routes.

The UI also hides operator-only surfaces where this can be determined client-side: terminal tabs and hotkeys, terminal runtime picker mode, provider/storage/integration/update settings, Company Brain, and raw Observatory diagnostics. These UI gates are not the security boundary; API and runtime checks remain authoritative.

The normal operator mode remains unchanged when the environment flags are unset.

## Current Boundary

This first implementation makes the customer lane materially safer, but it is not the full customer authorization model yet. Before real customer data, Optale still needs:

- role separation between Optale operators and customer users;
- audit retention/export rules for restricted-mode denials and approvals;
- end-to-end customer-mode acceptance tests;
- SAST/secret/container scanning evidence;
- dependency remediation for the remaining high findings.
