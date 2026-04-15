"use client";

import { useEffect, type ReactNode } from "react";
import { getApi } from "../api";
import { useAuthStore } from "../auth";
import { useWorkspaceStore } from "../workspace";
import { createLogger } from "../logger";
import { defaultStorage } from "./storage";
import {
  createLocalUser,
  createLocalWorkspace,
  isLocalToken,
  readStoredLocalUser,
} from "./local-mode";
import type { StorageAdapter } from "../types/storage";

const logger = createLogger("auth");
const INIT_MAX_RETRIES = 5;
const INIT_RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthInitializer({
  children,
  onLogin,
  onLogout,
  storage = defaultStorage,
}: {
  children: ReactNode;
  onLogin?: () => void;
  onLogout?: () => void;
  storage?: StorageAdapter;
}) {
  useEffect(() => {
    let disposed = false;
    const token = storage.getItem("multica_token");
    if (!token) {
      onLogout?.();
      useAuthStore.setState({ isLoading: false });
      return;
    }

    const api = getApi();
    api.setToken(token);
    const wsId = storage.getItem("multica_workspace_id");

    // Local offline mode: skip remote bootstrap and hydrate local state.
    if (isLocalToken(token)) {
      const storedUser = readStoredLocalUser(storage);
      const user = storedUser ?? createLocalUser("Local User");
      const workspace = createLocalWorkspace(user.name);
      useWorkspaceStore
        .getState()
        .hydrateWorkspace([workspace], wsId || workspace.id);
      useAuthStore.setState({ user, isLoading: false });
      onLogin?.();
      return;
    }

    async function initializeRemoteSession() {
      for (let attempt = 1; attempt <= INIT_MAX_RETRIES; attempt += 1) {
        try {
          const [user, wsList] = await Promise.all([api.getMe(), api.listWorkspaces()]);
          if (disposed) return;
          onLogin?.();
          useWorkspaceStore.getState().hydrateWorkspace(wsList, wsId);
          useAuthStore.setState({ user, isLoading: false });
          return;
        } catch (err) {
          logger.error("auth init failed", {
            attempt,
            maxAttempts: INIT_MAX_RETRIES,
            error: err,
          });

          if (attempt < INIT_MAX_RETRIES) {
            await sleep(INIT_RETRY_BASE_DELAY_MS * attempt);
          }
        }
      }

      if (disposed) return;

      // 本地模式：如果已有 user（本地登录设置的），保留登录状态
      const existingUser = useAuthStore.getState().user;
      if (existingUser) {
        logger.info("keeping local user session");
        const workspaceState = useWorkspaceStore.getState();
        if (!workspaceState.workspace) {
          const workspace = createLocalWorkspace(existingUser.name);
          workspaceState.hydrateWorkspace([workspace], wsId || workspace.id);
        }
        onLogin?.();
        useAuthStore.setState({ isLoading: false });
        return;
      }

      logger.warn("auth init retries exhausted; keep token and let caller retry");
      useAuthStore.setState({ user: null, isLoading: false });
    }

    void initializeRemoteSession();
    return () => {
      disposed = true;
    };
  }, [onLogin, onLogout, storage]);

  return <>{children}</>;
}
