import { isRootCabinetPath, normalizeCabinetPath } from "@/lib/cabinets/paths";
import { buildPath } from "@/lib/navigation/route-scheme";

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Clean-path URL for a task (PRD §11): `/room/<cab>/-/tasks/<id>`. Use this
 * for navigation/links; `buildTaskHash` is kept only for the legacy-hash
 * redirect and route round-trip tests.
 */
export function buildTaskPath(taskId: string, cabinetPath?: string | null): string {
  return buildPath(
    { type: "task", cabinetPath: cabinetPath ?? undefined, taskId },
    null
  );
}

export function buildTasksHash(cabinetPath?: string | null): string {
  const normalized = normalizeCabinetPath(cabinetPath, true);
  if (isRootCabinetPath(normalized)) {
    return "#/tasks";
  }
  return `#/cabinet/${encodeSegment(normalized || ".")}/tasks`;
}

export function buildTaskHash(taskId: string, cabinetPath?: string | null): string {
  return `${buildTasksHash(cabinetPath)}/${encodeSegment(taskId)}`;
}

export function buildTaskHref(taskId: string, cabinetPath?: string | null): string {
  return `/${buildTaskHash(taskId, cabinetPath)}`;
}
