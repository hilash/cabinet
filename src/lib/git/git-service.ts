import simpleGit, { SimpleGit } from "simple-git";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";
import path from "path";

// Per-directory git instances and commit timers
const gitInstances = new Map<string, SimpleGit | null>();
const commitTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function getGit(dataDir: string): Promise<SimpleGit | null> {
  if (gitInstances.has(dataDir)) return gitInstances.get(dataDir)!;

  const gitDir = path.join(dataDir, ".git");
  if (await fileExists(gitDir)) {
    const instance = simpleGit(dataDir);
    gitInstances.set(dataDir, instance);
    return instance;
  }

  // Initialize git in dir if not exists
  try {
    const instance = simpleGit(dataDir);
    await instance.init();
    await instance.addConfig("user.email", "kb@cabinet.dev");
    await instance.addConfig("user.name", "Cabinet");
    gitInstances.set(dataDir, instance);
    return instance;
  } catch {
    gitInstances.set(dataDir, null);
    return null;
  }
}

export async function autoCommit(
  pagePath: string,
  action: "Update" | "Add" | "Delete",
  dataDir: string = DATA_DIR
) {
  // Debounce commits per dataDir — batch within 5 seconds
  const existing = commitTimers.get(dataDir);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    commitTimers.delete(dataDir);
    try {
      const g = await getGit(dataDir);
      if (!g) return;

      await g.add(".");
      const status = await g.status();
      if (status.staged.length === 0 && status.modified.length === 0) return;

      await g.commit(`${action} ${pagePath}`);
    } catch (error) {
      console.error("Auto-commit failed:", error);
    }
  }, 5000);

  commitTimers.set(dataDir, timer);
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export async function getPageHistory(
  virtualPath: string,
  dataDir: string = DATA_DIR
): Promise<GitLogEntry[]> {
  const g = await getGit(dataDir);
  if (!g) return [];

  try {
    const candidates = [
      path.join(virtualPath, "index.md"),
      `${virtualPath}.md`,
      virtualPath,
    ];

    for (const candidate of candidates) {
      try {
        const log = await g.log({ file: candidate, maxCount: 50 });
        if (log.all.length > 0) {
          return log.all.map((entry) => ({
            hash: entry.hash,
            date: entry.date,
            message: entry.message,
            author: entry.author_name,
          }));
        }
      } catch {
        continue;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function getDiff(hash: string, dataDir: string = DATA_DIR): Promise<string> {
  const g = await getGit(dataDir);
  if (!g) return "";

  try {
    return await g.diff([`${hash}~1`, hash]);
  } catch {
    try {
      return await g.diff([hash]);
    } catch {
      return "";
    }
  }
}

export async function manualCommit(
  message: string,
  dataDir: string = DATA_DIR
): Promise<boolean> {
  const g = await getGit(dataDir);
  if (!g) return false;

  try {
    await g.add(".");
    const status = await g.status();
    if (
      status.staged.length === 0 &&
      status.modified.length === 0 &&
      status.not_added.length === 0
    ) {
      return false;
    }
    await g.commit(message);
    return true;
  } catch {
    return false;
  }
}

export async function restoreFileFromCommit(
  hash: string,
  filePath: string,
  dataDir: string = DATA_DIR
): Promise<boolean> {
  const g = await getGit(dataDir);
  if (!g) return false;

  try {
    await g.checkout([hash, "--", filePath]);
    await g.add(filePath);
    await g.commit(`Restore ${filePath} to version ${hash.slice(0, 8)}`);
    return true;
  } catch (error) {
    console.error("Restore failed:", error);
    return false;
  }
}

export async function gitPull(
  dataDir: string = DATA_DIR
): Promise<{ pulled: boolean; summary: string }> {
  const g = await getGit(dataDir);
  if (!g) return { pulled: false, summary: "Git not available" };

  try {
    const remotes = await g.getRemotes(true);
    if (remotes.length === 0) {
      return { pulled: false, summary: "No remote configured" };
    }

    const result = await g.pull();
    const changed = (result.files?.length || 0) > 0;
    const summary = changed
      ? `Pulled ${result.files.length} file(s) updated`
      : "Already up to date";
    return { pulled: changed, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pull failed";
    console.error("Git pull failed:", message);
    return { pulled: false, summary: message };
  }
}

export async function getStatus(
  dataDir: string = DATA_DIR
): Promise<{ uncommitted: number }> {
  const g = await getGit(dataDir);
  if (!g) return { uncommitted: 0 };

  try {
    const status = await g.status();
    return {
      uncommitted:
        status.modified.length +
        status.not_added.length +
        status.created.length +
        status.deleted.length,
    };
  } catch {
    return { uncommitted: 0 };
  }
}
