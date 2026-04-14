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

    Promise.all([api.getMe(), api.listWorkspaces()])
      .then(([user, wsList]) => {
        onLogin?.();
        useAuthStore.setState({ user, isLoading: false });
        useWorkspaceStore.getState().hydrateWorkspace(wsList, wsId);
      })
      .catch((err) => {
        logger.error("auth init failed", err);
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
        api.setToken(null);
        api.setWorkspaceId(null);
        storage.removeItem("multica_token");
        storage.removeItem("multica_workspace_id");
        onLogout?.();
        useAuthStore.setState({ user: null, isLoading: false });
      });
  }, []);

  return <>{children}</>;
}
