"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Header } from "@/components/layout/header";
import { KBEditor } from "@/components/editor/editor";
import { WebsiteViewer } from "@/components/editor/website-viewer";
import { PdfViewer } from "@/components/editor/pdf-viewer";
import { CsvViewer } from "@/components/editor/csv-viewer";
import { AgentsWorkspace } from "@/components/agents/agents-workspace";
import { JobsManager } from "@/components/jobs/jobs-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { TerminalTabs } from "@/components/terminal/terminal-tabs";
import { AIPanel } from "@/components/ai-panel/ai-panel";
import { SearchDialog } from "@/components/search/search-dialog";
import { KeyboardShortcuts } from "@/components/shortcuts/keyboard-shortcuts";
import { StatusBar } from "@/components/layout/status-bar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { UpdateDialog } from "@/components/layout/update-dialog";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { fetchUserTeams } from "@/lib/api/client";
import type { TreeNode } from "@/types";

const DISMISSED_UPDATE_STORAGE_KEY = "cabinet.dismissed-update-version";

function findNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function AppShell() {
  const loadTree = useTreeStore((s) => s.loadTree);
  const nodes = useTreeStore((s) => s.nodes);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const setTeams = useAppStore((s) => s.setTeams);
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
  const terminalOpen = useAppStore((s) => s.terminalOpen);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const setAiPanelCollapsed = useAppStore((s) => s.setAiPanelCollapsed);
  const aiPanelCollapsed = useAppStore((s) => s.aiPanelCollapsed);
  const {
    update,
    refreshing: updateRefreshing,
    applyPending,
    backupPending,
    backupPath,
    actionError,
    refresh: refreshUpdate,
    createBackup,
    openDataDir,
    applyUpdate,
  } = useCabinetUpdate({ autoRefresh: true });

  // Onboarding wizard state
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(DISMISSED_UPDATE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Load user's teams on mount; team selection triggers tree reload
  useEffect(() => {
    fetchUserTeams()
      .then((teams) => setTeams(teams))
      .catch(() => {/* no teams (legacy mode) */});
  }, [setTeams]);

  // Reload tree whenever active team changes
  useEffect(() => {
    loadTree();
  }, [loadTree, currentTeamSlug]);

  // Auto-refresh sidebar when /data changes (detected via SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/agents/events");
      es.addEventListener("tree_changed", () => loadTree());
    } catch {
      // SSE not supported
    }
    return () => es?.close();
  }, [loadTree]);

  // Check if company config exists (first-time setup)
  useEffect(() => {
    fetch("/api/agents/config")
      .then((r) => r.json())
      .then((data) => setShowWizard(!data.exists))
      .catch(() => setShowWizard(false));
  }, []);

  const handleWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSection({ type: "agents" });
    loadTree();
  }, [setSection, loadTree]);

  function handleUpdateLater() {
    const latestVersion = update?.latest?.version;
    if (latestVersion) {
      try {
        window.localStorage.setItem(DISMISSED_UPDATE_STORAGE_KEY, latestVersion);
      } catch {
        // ignore
      }
      setDismissedUpdateVersion(latestVersion);
    }
    setUpdateDialogOpen(false);
  }

  const selectedNode = selectedPath ? findNode(nodes, selectedPath) : null;
  // For paths not in the tree (e.g. .agents/ workspace files), infer type from extension
  const inferredType = !selectedNode && selectedPath
    ? selectedPath.endsWith(".csv") ? "csv"
    : selectedPath.endsWith(".pdf") ? "pdf"
    : null
    : null;
  const isWebsite = selectedNode?.type === "website";
  const isApp = selectedNode?.type === "app";
  const isPdf = selectedNode?.type === "pdf" || inferredType === "pdf";
  const isCsv = selectedNode?.type === "csv" || inferredType === "csv";
  const hasPersistentUpdateState =
    update?.updateStatus.state === "restart-required" ||
    update?.updateStatus.state === "failed" ||
    update?.updateStatus.state === "starting" ||
    update?.updateStatus.state === "backing-up" ||
    update?.updateStatus.state === "downloading" ||
    update?.updateStatus.state === "applying";
  const shouldPromptForUpdate =
    update?.updateAvailable === true &&
    !!update.latest?.version &&
    dismissedUpdateVersion !== update.latest.version;
  const effectiveUpdateDialogOpen =
    updateDialogOpen || hasPersistentUpdateState || shouldPromptForUpdate;

  // Auto-collapse sidebar + AI panel when entering app mode
  const prevIsApp = useRef(false);
  useEffect(() => {
    if (isApp && !prevIsApp.current) {
      setSidebarCollapsed(true);
      setAiPanelCollapsed(true);
    }
    prevIsApp.current = !!isApp;
  }, [isApp, setSidebarCollapsed, setAiPanelCollapsed]);

  const handleExitApp = () => {
    setSidebarCollapsed(false);
    setAiPanelCollapsed(false);
  };

  // Determine what to render in the main area
  const renderContent = () => {
    // System sections (non-page views)
    if (section.type === "settings") return <SettingsPage />;
    if (section.type === "agents") {
      return <AgentsWorkspace selectedScope="all" selectedAgentSlug={null} />;
    }
    if (section.type === "agent") {
      return (
        <AgentsWorkspace
          selectedScope="agent"
          selectedAgentSlug={section.slug || null}
        />
      );
    }
    if (section.type === "jobs") return <JobsManager />;

    // Page-based views (when a KB page is selected)
    if (isApp && selectedNode) {
      return (
        <WebsiteViewer
          path={selectedNode.path}
          title={selectedNode.frontmatter?.title || selectedNode.name}
          fullscreen
          onExit={handleExitApp}
        />
      );
    }
    if (isCsv && (selectedNode || selectedPath)) {
      const csvPath = selectedNode?.path || selectedPath!;
      const csvTitle = selectedNode?.frontmatter?.title || selectedNode?.name || csvPath.split("/").pop() || "CSV";
      return (
        <CsvViewer
          path={csvPath}
          title={csvTitle}
        />
      );
    }
    if (isPdf && (selectedNode || selectedPath)) {
      const pdfPath = selectedNode?.path || selectedPath!;
      const pdfTitle = selectedNode?.frontmatter?.title || selectedNode?.name || pdfPath.split("/").pop() || "PDF";
      return (
        <PdfViewer
          path={pdfPath}
          title={pdfTitle}
        />
      );
    }
    if (isWebsite && selectedNode) {
      return (
        <WebsiteViewer
          path={selectedNode.path}
          title={selectedNode.frontmatter?.title || selectedNode.name}
        />
      );
    }

    // Default: editor
    return (
      <>
        <Header />
        <KBEditor />
      </>
    );
  };

  // Show nothing while checking config
  if (showWizard === null) {
    return <div className="flex h-screen bg-background" />;
  }

  // Show onboarding wizard for first-time users
  if (showWizard) {
    return <OnboardingWizard onComplete={handleWizardComplete} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </main>
        {terminalOpen && <TerminalTabs />}
        <StatusBar />
      </div>
      {!aiPanelCollapsed && <AIPanel />}
      <SearchDialog />
      <KeyboardShortcuts />
      <UpdateDialog
        open={effectiveUpdateDialogOpen}
        update={update}
        refreshing={updateRefreshing}
        applyPending={applyPending}
        backupPending={backupPending}
        backupPath={backupPath}
        actionError={actionError}
        onOpenChange={(open) => {
          if (open) {
            setUpdateDialogOpen(true);
            return;
          }
          handleUpdateLater();
        }}
        onRefresh={() => {
          void refreshUpdate();
        }}
        onApply={applyUpdate}
        onCreateBackup={async () => {
          await createBackup("data");
        }}
        onOpenDataDir={openDataDir}
        onLater={handleUpdateLater}
      />
    </div>
  );
}
