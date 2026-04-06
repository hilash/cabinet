"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UpdateCheckResult } from "@/types";

interface UseCabinetUpdateOptions {
  autoRefresh?: boolean;
}

const AUTO_REFRESH_MS = 4 * 60 * 60 * 1000;
const ACTIVE_POLL_MS = 1500;

function isActiveUpdateState(state: UpdateCheckResult["updateStatus"]["state"] | undefined): boolean {
  return (
    state === "starting" ||
    state === "backing-up" ||
    state === "downloading" ||
    state === "applying"
  );
}

export function useCabinetUpdate(options: UseCabinetUpdateOptions = {}) {
  const { autoRefresh = false } = options;
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyPending, setApplyPending] = useState(false);
  const [backupPending, setBackupPending] = useState(false);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/system/update", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Update check failed (${response.status})`);
      }
      const data = (await response.json()) as UpdateCheckResult;
      setUpdate(data);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Update check failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const createBackup = useCallback(async (scope: "data" | "project" = "data") => {
    setBackupPending(true);
    try {
      const response = await fetch("/api/system/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = (await response.json()) as { backupPath?: string; error?: string };
      if (!response.ok || !data.backupPath) {
        throw new Error(data.error || `Backup failed (${response.status})`);
      }
      setBackupPath(data.backupPath);
      setActionError(null);
      return data.backupPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup failed";
      setActionError(message);
      throw error;
    } finally {
      setBackupPending(false);
    }
  }, []);

  const openDataDir = useCallback(async () => {
    try {
      const response = await fetch("/api/system/open-data-dir", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Failed to open data folder (${response.status})`);
      }
      setActionError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open data folder";
      setActionError(message);
      throw error;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    setApplyPending(true);
    try {
      const response = await fetch("/api/system/update/apply", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Update failed to start (${response.status})`);
      }
      setActionError(null);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed to start";
      setActionError(message);
      throw error;
    } finally {
      setApplyPending(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, AUTO_REFRESH_MS);

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (!isActiveUpdateState(update?.updateStatus.state)) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, ACTIVE_POLL_MS);

    return () => window.clearInterval(interval);
  }, [refresh, update?.updateStatus.state]);

  return useMemo(
    () => ({
      update,
      loading,
      refreshing,
      applyPending,
      backupPending,
      backupPath,
      actionError,
      refresh,
      createBackup,
      openDataDir,
      applyUpdate,
    }),
    [
      update,
      loading,
      refreshing,
      applyPending,
      backupPending,
      backupPath,
      actionError,
      refresh,
      createBackup,
      openDataDir,
      applyUpdate,
    ]
  );
}
