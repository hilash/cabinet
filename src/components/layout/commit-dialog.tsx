"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChangedFile } from "@/lib/git/git-service";

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamSlug: string | null;
  onCommitted: () => void;
}

function statusColor(status: ChangedFile["status"]) {
  switch (status) {
    case "added":
      return "text-green-500 dark:text-green-400";
    case "deleted":
      return "text-red-500 dark:text-red-400";
    case "renamed":
      return "text-blue-500 dark:text-blue-400";
    default:
      return "text-amber-500 dark:text-amber-400";
  }
}

function statusLabel(status: ChangedFile["status"]) {
  return status[0].toUpperCase(); // M / A / D / R
}

export function CommitDialog({
  open,
  onOpenChange,
  teamSlug,
  onCommitted,
}: CommitDialogProps) {
  const { data: session } = authClient.useSession();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<null | "commit" | "commit-push">(null);
  const [error, setError] = useState("");

  const endpoint = teamSlug
    ? `/api/teams/${teamSlug}/git/commit`
    : `/api/git/commit`;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch file list");
      const data = await res.json();
      const fileList: ChangedFile[] = data.files ?? [];
      setFiles(fileList);
      setSelectedPaths(new Set(fileList.map((f) => f.path)));
    } catch {
      setError("Could not load changed files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (open) {
      setMessage("");
      setError("");
      void fetchFiles();
    }
  }, [open, fetchFiles]);

  const allSelected = files.length > 0 && selectedPaths.size === files.length;

  function handleToggleAll() {
    if (allSelected) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(files.map((f) => f.path)));
    }
  }

  function handleToggleFile(filePath: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }

  const pushEndpoint = teamSlug
    ? `/api/teams/${teamSlug}/git/push`
    : `/api/git/push`;

  async function doCommit(): Promise<boolean> {
    const authorName =
      session?.user?.name || session?.user?.email || "Cabinet User";
    const authorEmail = session?.user?.email || "kb@cabinet.dev";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.trim(),
        files: Array.from(selectedPaths),
        authorName,
        authorEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Commit failed");
    if (!data.committed) {
      setError("Nothing to commit — selected files may already be up to date.");
      return false;
    }
    return true;
  }

  async function handleCommit() {
    if (!message.trim() || selectedPaths.size === 0) return;
    setAction("commit");
    setError("");
    try {
      const committed = await doCommit();
      if (committed) {
        onCommitted();
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setAction(null);
    }
  }

  async function handleCommitAndPush() {
    if (!message.trim() || selectedPaths.size === 0) return;
    setAction("commit-push");
    setError("");
    try {
      const committed = await doCommit();
      if (!committed) return;

      onCommitted();

      const res = await fetch(pushEndpoint, { method: "POST" });
      const data = await res.json();

      if (data.pushed) {
        onOpenChange(false);
      } else {
        setError(`Committed successfully, but push failed:\n${data.summary || "Unknown error"}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setAction(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Commit Changes</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Commit message
          </label>
          <Input
            placeholder="Describe your changes..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleCommit();
              }
            }}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Files to include{" "}
              {!loading && files.length > 0 && (
                <span className="text-muted-foreground/60">
                  ({selectedPaths.size}/{files.length} selected)
                </span>
              )}
            </label>
            {!loading && files.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleToggleAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-input bg-muted/30 p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No changes to commit
              </p>
            ) : (
              files.map((file) => (
                <label
                  key={file.path}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(file.path)}
                    onChange={() => handleToggleFile(file.path)}
                    className="h-3 w-3 shrink-0 accent-primary"
                  />
                  <span
                    className={cn(
                      "flex-1 truncate font-mono text-xs",
                      statusColor(file.status)
                    )}
                    title={file.path}
                  >
                    {file.path}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-muted-foreground/60 uppercase">
                    {statusLabel(file.status)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <DialogFooter showCloseButton>
          <Button
            variant="outline"
            onClick={handleCommit}
            disabled={
              !message.trim() ||
              selectedPaths.size === 0 ||
              action !== null ||
              loading
            }
          >
            {action === "commit" ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Committing...
              </>
            ) : (
              "Commit"
            )}
          </Button>
          <Button
            onClick={handleCommitAndPush}
            disabled={
              !message.trim() ||
              selectedPaths.size === 0 ||
              action !== null ||
              loading
            }
          >
            {action === "commit-push" ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Working...
              </>
            ) : (
              "Commit & Push"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
