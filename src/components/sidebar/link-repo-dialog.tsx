"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";

interface LinkRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function basenameForPath(value: string): string {
  const normalized = value.trim().replace(/[\\/]+$/, "");
  if (!normalized) return "";
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

export function LinkRepoDialog({ open, onOpenChange }: LinkRepoDialogProps) {
  const loadTree = useTreeStore((s) => s.loadTree);
  const selectPage = useTreeStore((s) => s.selectPage);
  const loadPage = useEditorStore((s) => s.loadPage);
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);

  const [localPath, setLocalPath] = useState("");
  const [name, setName] = useState("");
  const [remote, setRemote] = useState("");
  const [description, setDescription] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setLocalPath("");
      setName("");
      setRemote("");
      setDescription("");
      setBrowsing(false);
      setCreating(false);
      setError("");
    }
  }, [open]);

  async function handleBrowse() {
    setBrowsing(true);
    setError("");

    try {
      const res = await fetch("/api/system/pick-directory", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to open folder picker.");
      }

      if (data?.cancelled || !data?.path) {
        return;
      }

      setLocalPath(data.path);
      setName((current) => current || basenameForPath(data.path));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to open folder picker."
      );
    } finally {
      setBrowsing(false);
    }
  }

  async function handleCreate() {
    if (!localPath.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/system/link-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localPath: localPath.trim(),
          name: name.trim() || basenameForPath(localPath),
          remote: remote.trim() || undefined,
          description: description.trim() || undefined,
          teamSlug: currentTeamSlug ?? undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add repo symlink.");
      }

      await loadTree();
      selectPage(data.path);
      await loadPage(data.path);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to add repo symlink."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Symlinked Repo</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-xs text-muted-foreground">
            Cabinet will create a KB folder, a visible <code>source</code>{" "}
            symlink to the local repo,
            and a <code>.repo.yaml</code> file that matches the linked-repo
            format from Getting Started.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Local Path
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="/Users/me/Development/my-repo"
                value={localPath}
                onChange={(event) => setLocalPath(event.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleBrowse()}
                disabled={browsing || creating}
              >
                {browsing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FolderOpen data-icon="inline-start" />
                )}
                Browse
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              placeholder={basenameForPath(localPath) || "My Repo"}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Remote URL
            </label>
            <Input
              placeholder="Auto-detect from git remote (optional)"
              value={remote}
              onChange={(event) => setRemote(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Input
              placeholder="Optional short summary"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!localPath.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
