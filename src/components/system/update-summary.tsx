"use client";

import { AlertTriangle, CloudDownload, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import type { UpdateCheckResult } from "@/types";

interface UpdateSummaryProps {
  update: UpdateCheckResult;
  loading?: boolean;
  refreshing?: boolean;
  applyPending?: boolean;
  backupPending?: boolean;
  backupPath?: string | null;
  actionError?: string | null;
  onRefresh: () => void;
  onApply: () => Promise<void> | void;
  onCreateBackup: () => Promise<void> | void;
  onOpenDataDir: () => Promise<void> | void;
}

function statusLabel(update: UpdateCheckResult): string {
  const state = update.updateStatus.state;
  if (state === "restart-required") return "需要重启";
  if (state === "failed") return "更新失败";
  if (state === "starting") return "正在启动更新";
  if (state === "backing-up") return "正在创建备份";
  if (state === "downloading") return "正在下载";
  if (state === "applying") return "正在应用更新";
  if (update.updateAvailable) return "有可用更新";
  return "已是最新";
}

export function UpdateSummary({
  update,
  loading,
  refreshing,
  applyPending,
  backupPending,
  backupPath,
  actionError,
  onRefresh,
  onApply,
  onCreateBackup,
  onOpenDataDir,
}: UpdateSummaryProps) {
  const state = update.updateStatus.state;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CloudDownload className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Cabinet 更新</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            当前 {update.current.version}
            {update.latest ? ` • 最新 ${update.latest.version}` : ""}
            {` • ${update.installKind}`}
          </p>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {loading ? "检查中..." : statusLabel(update)}
        </div>
      </div>

      <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <p className="font-medium text-foreground">数据目录</p>
          <p className="mt-1 break-all font-mono text-[11px]">{update.dataDir}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <p className="font-medium text-foreground">备份</p>
          <p className="mt-1 break-all font-mono text-[11px]">{update.backupRoot}</p>
        </div>
      </div>

      {update.updateAvailable && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Cabinet 仍处于实验阶段且迭代很快，更新前请备份数据。
            </p>
          </div>
        </div>
      )}

      {update.instructions.length > 0 && (
        <div className="space-y-2">
          {update.instructions.map((instruction) => (
            <p key={instruction} className="text-xs text-muted-foreground">
              {instruction}
            </p>
          ))}
        </div>
      )}

      {update.dirtyAppFiles.length > 0 && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-medium">检测到本地代码变更</p>
          <p className="mt-1 break-all font-mono text-[11px]">
            {update.dirtyAppFiles.slice(0, 8).join(", ")}
            {update.dirtyAppFiles.length > 8 ? ` 及其他 ${update.dirtyAppFiles.length - 8} 个文件` : ""}
          </p>
        </div>
      )}

      {(update.updateStatus.message || update.updateStatus.error || backupPath || actionError) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {update.updateStatus.message && <p>{update.updateStatus.message}</p>}
          {update.updateStatus.backupPath && (
            <p className="break-all font-mono text-[11px]">备份: {update.updateStatus.backupPath}</p>
          )}
          {backupPath && <p className="break-all font-mono text-[11px]">最新备份: {backupPath}</p>}
          {update.updateStatus.error && <p className="text-destructive">{update.updateStatus.error}</p>}
          {actionError && <p className="text-destructive">{actionError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            onRefresh();
          }}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          立即检查
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            void onOpenDataDir();
          }}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          打开数据目录
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            void onCreateBackup();
          }}
          disabled={backupPending}
        >
          {backupPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
          创建备份
        </Button>
        {update.canApplyUpdate && state !== "restart-required" && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => {
              void onApply();
            }}
            disabled={applyPending}
          >
            {applyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
            立即更新
          </Button>
        )}
      </div>
    </div>
  );
}
