export const ROOT_CABINET_PATH = ".";

/**
 * Page paths in named sub-cabinets are data-relative and include the board as
 * their first segment (e.g. `zeropoint-capital/kb/reports/foo`) — that full
 * path is what `loadPage`/`readPage` resolve against. Links and artifact paths
 * are sometimes recorded cabinet-RELATIVE (`kb/reports/foo`, board dropped),
 * which then 404s and renders the "no index.md" placeholder. Re-add the board
 * prefix when missing. No-op for the root cabinet, empty paths, or paths that
 * already carry the board (so canonical paths are never double-prefixed).
 */
export function ensureCabinetPrefixedPagePath(
  cabinetPath: string | undefined,
  pagePath: string
): string {
  if (
    !cabinetPath ||
    cabinetPath === ROOT_CABINET_PATH ||
    !pagePath ||
    pagePath === cabinetPath ||
    pagePath.startsWith(`${cabinetPath}/`)
  ) {
    return pagePath;
  }
  return `${cabinetPath}/${pagePath}`;
}

export function normalizeCabinetPath(
  value?: string | null,
  fallbackToRoot = false
): string | undefined {
  if (typeof value !== "string") {
    return fallbackToRoot ? ROOT_CABINET_PATH : undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/" || trimmed === "./") {
    return fallbackToRoot ? ROOT_CABINET_PATH : undefined;
  }

  if (trimmed === ROOT_CABINET_PATH) {
    return ROOT_CABINET_PATH;
  }

  return trimmed
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function isRootCabinetPath(value?: string | null): boolean {
  return normalizeCabinetPath(value, true) === ROOT_CABINET_PATH;
}

export function buildCabinetScopedId(
  cabinetPath: string | undefined,
  entity: "agent" | "job",
  id: string
): string {
  const normalized = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  return `${normalized}::${entity}::${id}`;
}
