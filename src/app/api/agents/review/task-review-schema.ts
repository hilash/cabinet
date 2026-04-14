const VALID_PRIORITIES = new Set(["P0", "P1", "P2"]);
const VALID_EFFORTS = new Set(["small", "medium", "large"]);
const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 10;

export interface TaskReviewResult {
  description: string;
  tags: string[];
  priority: string;
  estimatedEffort: string;
  acceptanceCriteria: string[];
  suggestions: string;
}

export function validateTaskReviewSchema(value: unknown): TaskReviewResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  const obj = value as Record<string, unknown>;

  const description =
    typeof obj.description === "string"
      ? obj.description.trim().slice(0, MAX_STRING_LENGTH)
      : "";
  if (!description) {
    throw new Error("Missing or empty 'description'");
  }

  const tags: string[] = [];
  if (Array.isArray(obj.tags)) {
    for (const t of obj.tags.slice(0, MAX_ARRAY_LENGTH)) {
      if (typeof t === "string" && t.trim()) {
        tags.push(t.trim().slice(0, 100));
      }
    }
  }

  const rawPriority =
    typeof obj.priority === "string" ? obj.priority.trim().toUpperCase() : "";
  const priority = VALID_PRIORITIES.has(rawPriority) ? rawPriority : "P2";

  const rawEffort =
    typeof obj.estimatedEffort === "string"
      ? obj.estimatedEffort.trim().toLowerCase()
      : "";
  const estimatedEffort = VALID_EFFORTS.has(rawEffort) ? rawEffort : "medium";

  const acceptanceCriteria: string[] = [];
  if (Array.isArray(obj.acceptanceCriteria)) {
    for (const c of obj.acceptanceCriteria.slice(0, MAX_ARRAY_LENGTH)) {
      if (typeof c === "string" && c.trim()) {
        acceptanceCriteria.push(c.trim().slice(0, MAX_STRING_LENGTH));
      }
    }
  }

  const suggestions =
    typeof obj.suggestions === "string"
      ? obj.suggestions.trim().slice(0, MAX_STRING_LENGTH)
      : "";

  return {
    description,
    tags,
    priority,
    estimatedEffort,
    acceptanceCriteria,
    suggestions,
  };
}
