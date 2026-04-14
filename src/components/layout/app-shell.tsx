"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Header } from "@/components/layout/header";
import { KBEditor } from "@/components/editor/editor";
import { WebsiteViewer } from "@/components/editor/website-viewer";
import { PdfViewer } from "@/components/editor/pdf-viewer";
import { CsvViewer } from "@/components/editor/csv-viewer";
import { SourceViewer } from "@/components/editor/source-viewer";
import { ImageViewer } from "@/components/editor/image-viewer";
import { MediaViewer } from "@/components/editor/media-viewer";
import { MermaidViewer } from "@/components/editor/mermaid-viewer";
import { FileFallbackViewer } from "@/components/editor/file-fallback-viewer";
import { HomeScreen } from "@/components/home/home-screen";
import { AgentsWorkspace } from "@/components/agents/agents-workspace";
import { JobsManager } from "@/components/jobs/jobs-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import dynamic from "next/dynamic";

const InboxPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.InboxPage), { ssr: false });
const MyIssuesPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.MyIssuesPage), { ssr: false });
const MulticaAgentsPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.MulticaAgentsPage), { ssr: false });
const RuntimesPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.RuntimesPage), { ssr: false });
const SkillsPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.SkillsPage), { ssr: false });
const MulticaSettingsPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.MulticaSettingsPage), { ssr: false });
const IssuesPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.IssuesPage), { ssr: false });
const IssueDetail = dynamic(() => import("@/components/integrations/multica-views").then(m => m.IssueDetail), { ssr: false });
const ProjectsPage = dynamic(() => import("@/components/integrations/multica-views").then(m => m.ProjectsPage), { ssr: false });
const ProjectDetail = dynamic(() => import("@/components/integrations/multica-views").then(m => m.ProjectDetail), { ssr: false });
import { TerminalTabs } from "@/components/terminal/terminal-tabs";
import { AIPanel } from "@/components/ai-panel/ai-panel";
import { SearchDialog } from "@/components/search/search-dialog";
import { KeyboardShortcuts } from "@/components/shortcuts/keyboard-shortcuts";
import { StatusBar } from "@/components/layout/status-bar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { UpdateDialog } from "@/components/layout/update-dialog";
import { NotificationToasts } from "@/components/layout/notification-toasts";
import { MulticaModals } from "@/components/integrations/multica-modals";
import { MulticaAuthGuard } from "@/components/integrations/multica-auth-guard";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useHashRoute } from "@/hooks/use-hash-route";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
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
  const terminalOpen = useAppStore((s) => s.terminalOpen);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
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

  // Sync navigation state with URL hash + localStorage
  useHashRoute();

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

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Auto-refresh sidebar when /data changes (detected via SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/agents/events");
      es.addEventListener("tree_changed", () => loadTree());
      es.addEventListener("conversation_completed", (e) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(
            new CustomEvent("cabinet:conversation-completed", { detail: data })
          );
        } catch { /* ignore */ }
      });
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
    setSection({ type: "home" });
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
  const nodeType = selectedNode?.type || inferredType;
  const isWebsite = nodeType === "website";
  const isApp = nodeType === "app";
  const isPdf = nodeType === "pdf";
  const isCsv = nodeType === "csv";
  const isCode = nodeType === "code";
  const isImage = nodeType === "image";
  const isVideo = nodeType === "video";
  const isAudio = nodeType === "audio";
  const isMermaid = nodeType === "mermaid";
  const isUnknown = nodeType === "unknown";
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
    if (section.type === "home") return <HomeScreen />;
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
    if (section.type === "inbox") return <MulticaAuthGuard><InboxPage /></MulticaAuthGuard>;
    if (section.type === "my-issues") return <MulticaAuthGuard><MyIssuesPage /></MulticaAuthGuard>;
    if (section.type === "issues") return <MulticaAuthGuard><IssuesPage /></MulticaAuthGuard>;
    if (section.type === "issue-detail") {
      return <MulticaAuthGuard>{section.id ? <IssueDetail issueId={section.id} /> : <IssuesPage />}</MulticaAuthGuard>;
    }
    if (section.type === "projects") return <MulticaAuthGuard><ProjectsPage /></MulticaAuthGuard>;
    if (section.type === "project-detail") {
      return <MulticaAuthGuard>{section.id ? <ProjectDetail projectId={section.id} /> : <ProjectsPage />}</MulticaAuthGuard>;
    }
    if (section.type === "agents-multica") return <MulticaAuthGuard><MulticaAgentsPage /></MulticaAuthGuard>;
    if (section.type === "agent-multica") return <MulticaAuthGuard><MulticaAgentsPage /></MulticaAuthGuard>;
    if (section.type === "runtimes") return <MulticaAuthGuard><RuntimesPage /></MulticaAuthGuard>;
    if (section.type === "skills") return <MulticaAuthGuard><SkillsPage /></MulticaAuthGuard>;
    if (section.type === "multica-settings") return <MulticaAuthGuard><MulticaSettingsPage /></MulticaAuthGuard>;

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
    if (isCode && (selectedNode || selectedPath)) {
      const codePath = selectedNode?.path || selectedPath!;
      const codeTitle = selectedNode?.frontmatter?.title || selectedNode?.name || codePath.split("/").pop() || "Source";
      return <SourceViewer path={codePath} title={codeTitle} />;
    }
    if (isImage && (selectedNode || selectedPath)) {
      const imgPath = selectedNode?.path || selectedPath!;
      const imgTitle = selectedNode?.frontmatter?.title || selectedNode?.name || imgPath.split("/").pop() || "Image";
      return <ImageViewer path={imgPath} title={imgTitle} />;
    }
    if ((isVideo || isAudio) && (selectedNode || selectedPath)) {
      const mediaPath = selectedNode?.path || selectedPath!;
      const mediaTitle = selectedNode?.frontmatter?.title || selectedNode?.name || mediaPath.split("/").pop() || "Media";
      return <MediaViewer path={mediaPath} title={mediaTitle} type={isVideo ? "video" : "audio"} />;
    }

    if (isMermaid && (selectedNode || selectedPath)) {
      const mmdPath = selectedNode?.path || selectedPath!;
      const mmdTitle = selectedNode?.frontmatter?.title || selectedNode?.name || mmdPath.split("/").pop() || "Diagram";
      return <MermaidViewer path={mmdPath} title={mmdTitle} />;
    }

    if (isUnknown && (selectedNode || selectedPath)) {
      const unkPath = selectedNode?.path || selectedPath!;
      const unkTitle = selectedNode?.frontmatter?.title || selectedNode?.name || unkPath.split("/").pop() || "File";
      return <FileFallbackViewer path={unkPath} title={unkTitle} />;
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
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ '--sidebar-toggle-offset': sidebarCollapsed ? '2.25rem' : '0px' } as React.CSSProperties}
      >
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
      <NotificationToasts />
      <MulticaModals />
    </div>
  );
}
