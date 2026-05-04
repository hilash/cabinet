export type OptaleRuntimeMode = "operator" | "restricted_customer";

type RuntimeModeEnv = Partial<Record<string, string | undefined>>;

function envValue(env: RuntimeModeEnv, key: string): string {
  return (env[key] || "").trim().toLowerCase();
}

export function isOptaleRestrictedCustomerMode(
  env: RuntimeModeEnv = process.env,
): boolean {
  const runtimeMode =
    envValue(env, "OPTALE_RUNTIME_MODE") ||
    envValue(env, "NEXT_PUBLIC_OPTALE_RUNTIME_MODE");
  if (
    runtimeMode === "restricted_customer" ||
    runtimeMode === "restricted-customer" ||
    runtimeMode === "customer_restricted" ||
    runtimeMode === "customer-restricted"
  ) {
    return true;
  }

  const customerMode =
    envValue(env, "OPTALE_CUSTOMER_MODE") ||
    envValue(env, "NEXT_PUBLIC_OPTALE_CUSTOMER_MODE");
  if (
    customerMode === "restricted" ||
    customerMode === "restricted_customer" ||
    customerMode === "restricted-customer" ||
    customerMode === "pilot" ||
    customerMode === "true" ||
    customerMode === "1"
  ) {
    return true;
  }

  const desktopProfile =
    envValue(env, "OPTALE_DESKTOP_PROFILE") ||
    envValue(env, "NEXT_PUBLIC_OPTALE_DESKTOP_PROFILE");
  return (
    desktopProfile === "partner" ||
    desktopProfile === "customer" ||
    desktopProfile === "restricted" ||
    desktopProfile === "restricted_customer" ||
    desktopProfile === "restricted-customer"
  );
}

export function getOptaleRuntimeMode(
  env: RuntimeModeEnv = process.env,
): OptaleRuntimeMode {
  return isOptaleRestrictedCustomerMode(env) ? "restricted_customer" : "operator";
}
