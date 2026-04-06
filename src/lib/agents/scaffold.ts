import path from "path";
import { ensureDirectory } from "@/lib/storage/fs-operations";

export const STANDARD_AGENT_SUBDIRECTORIES = [
  "jobs",
  "skills",
  "sessions",
  "memory",
  "workspace",
] as const;

export async function ensureAgentScaffold(agentDir: string): Promise<void> {
  await Promise.all(
    STANDARD_AGENT_SUBDIRECTORIES.map((subdir) =>
      ensureDirectory(path.join(agentDir, subdir))
    )
  );
}
