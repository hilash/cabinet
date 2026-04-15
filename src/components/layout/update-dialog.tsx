"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@multica/ui/components/ui/dialog";
import { Button } from "@multica/ui/components/ui/button";
import { UpdateSummary } from "@/components/system/update-summary";
import type { UpdateCheckResult } from "@/types";

interface UpdateDialogProps {
  open: boolean;
  update: UpdateCheckResult | null;
  refreshing: boolean;
  applyPending: boolean;
  backupPending: boolean;
  backupPath: string | null;
  actionError: string | null;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onApply: () => Promise<void>;
  onCreateBackup: () => Promise<void>;
  onOpenDataDir: () => Promise<void>;
  onLater: () => void;
}

export function UpdateDialog({
  open,
  update,
  refreshing,
  applyPending,
  backupPending,
  backupPath,
  actionError,
  onOpenChange,
  onRefresh,
  onApply,
  onCreateBackup,
  onOpenDataDir,
  onLater,
}: UpdateDialogProps) {
  if (!update) return null;

  const latestVersion = update.latest?.version;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="gap-2">
          <DialogTitle>
            {update.updateStatus.state === "restart-required"
              ? "重启 Cabinet 以完成更新"
              : latestVersion && update.updateAvailable
                ? `Cabinet ${latestVersion} 可用`
                : "Cabinet 更新"}
          </DialogTitle>
          <DialogDescription>
            Cabinet 会自动检查更新。产品仍处于实验阶段，安装更新前请备份数据。
          </DialogDescription>
        </DialogHeader>

        <UpdateSummary
          update={update}
          refreshing={refreshing}
          applyPending={applyPending}
          backupPending={backupPending}
          backupPath={backupPath}
          actionError={actionError}
          onRefresh={onRefresh}
          onApply={onApply}
          onCreateBackup={onCreateBackup}
          onOpenDataDir={onOpenDataDir}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onLater}>
            稍后
          </Button>
          {update.latestReleaseNotesUrl && (
            <Button
              variant="ghost"
              render={
                <a
                  href={update.latestReleaseNotesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              更新日志
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
