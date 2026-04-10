"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Send,
  Sparkles,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Loader2,
  Folder,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { WebTerminal } from "@/components/terminal/web-terminal";
import type { TreeNode } from "@/types";
import type { ConversationDetail, ConversationMeta } from "@/types/conversations";

interface FlatPage {
  path: string;
  title: string;
}

function flattenTree(nodes: TreeNode[]): FlatPage[] {
  const result: FlatPage[] = [];
  for (const node of nodes) {
    if (node.type !== "website") {
      result.push({
        path: node.path,
        title: node.frontmatter?.title || node.name,
      });
    }
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function getParentPath(path: string): string | null {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? null : path.slice(0, idx);
}

interface BrowseItem {
  node: TreeNode;
  isFolder: boolean;
}

function getBrowseItems(nodes: TreeNode[], browsePath: string | null): BrowseItem[] {
  const children =
    browsePath === null ? nodes : (findNodeByPath(nodes, browsePath)?.children ?? []);
  return (children ?? [])
    .filter((n) => n.type !== "website")
    .map((n) => ({ node: n, isFolder: !!(n.children && n.children.length > 0) }));
}

interface PastSession {
  id: string;
  pagePath: string;
  instruction: string;
  timestamp: string;
  duration?: number;
  status: "completed" | "failed" | "cancelled";
  summary: string;
}

export function AIPanel() {
  const {
    isOpen,
    close,
    editorSessions,
    addEditorSession,
    markSessionCompleted,
    removeSession,
    clearAllSessions,
  } = useAIPanelStore();
  const { currentPath } = useEditorStore();
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
  const treeNodes = useTreeStore((s) => s.nodes);
  const [input, setInput] = useState("");
  const [mentionedPages, setMentionedPages] = useState<string[]>([]);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [expandedPast, setExpandedPast] = useState<Set<string>>(new Set());
  const [pastSessionDetails, setPastSessionDetails] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevIsOpenRef = useRef(false);

  // @ mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [mentionBrowsePath, setMentionBrowsePath] = useState<string | null>(null);

  const loadPastSessions = useCallback(async () => {
    if (!currentPath || !isOpen) return;
    try {
      const res = await fetch(
        `/api/agents/conversations?agent=editor&pagePath=${encodeURIComponent(currentPath)}&limit=20`
      );
      if (!res.ok) return;

      const data = await res.json();
      const conversations = (data.conversations || []) as ConversationMeta[];
      const nextSessions = conversations
        .filter((conversation) => conversation.status !== "running")
        .map((conversation) => {
          const duration = conversation.completedAt
            ? Math.max(
                0,
                Math.round(
                  (new Date(conversation.completedAt).getTime() -
                    new Date(conversation.startedAt).getTime()) /
                    1000
                )
              )
            : undefined;

          return {
            id: conversation.id,
            pagePath: currentPath,
            instruction: conversation.title,
            timestamp: conversation.startedAt,
            duration,
            status:
              conversation.status === "failed"
                ? "failed"
                : conversation.status === "cancelled"
                  ? "cancelled"
                  : "completed",
            summary: conversation.summary || "",
          } satisfies PastSession;
        });

      setPastSessions(nextSessions);
    } catch {}
  }, [currentPath, isOpen]);

  // Sessions for the current page
  const currentPageSessions = editorSessions.filter(
    (s) => s.pagePath === currentPath && s.status === "running"
  );
  // Sessions for OTHER pages (shown as a summary)
  const otherPageRunningSessions = editorSessions.filter(
    (s) => s.pagePath !== currentPath && s.status === "running"
  );

  // Restore sessions from sessionStorage on mount and validate against terminal server
  useEffect(() => {
    const restore = async () => {
      useAIPanelStore.getState().restoreSessionsFromStorage();

      // Check which restored sessions are still alive on the terminal server
      try {
        const res = await fetch("/api/daemon/sessions");
        if (res.ok) {
          const serverSessions: { id: string; exited: boolean }[] = await res.json();
          const aliveIds = new Set(serverSessions.filter((s) => !s.exited).map((s) => s.id));
          const exitedIds = new Set(serverSessions.filter((s) => s.exited).map((s) => s.id));

          const state = useAIPanelStore.getState();
          for (const session of state.editorSessions) {
            if (session.status === "running" && session.reconnect) {
              if (exitedIds.has(session.sessionId)) {
                // Process finished while we were away — mark completed
                state.markSessionCompleted(session.sessionId);
              } else if (!aliveIds.has(session.sessionId)) {
                // Session no longer exists on server at all — remove it
                state.removeSession(session.sessionId);
              }
              // If alive, it stays as reconnect=true and the WebTerminal will reconnect
            }
          }
        }
      } catch {
        // Terminal server not reachable — clear all reconnect sessions
        const state = useAIPanelStore.getState();
        for (const session of state.editorSessions) {
          if (session.reconnect) {
            state.removeSession(session.sessionId);
          }
        }
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allPages = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  const filteredPages = useMemo(
    () =>
      allPages.filter(
        (p) =>
          p.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          p.path.toLowerCase().includes(mentionQuery.toLowerCase())
      ),
    [allPages, mentionQuery]
  );

  // Load past sessions when page changes
  useEffect(() => {
    void loadPastSessions();
  }, [loadPastSessions]);

  // Auto-scroll on new sessions
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentPageSessions.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-mention current page each time the panel opens
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    if (isOpen && !wasOpen && currentPath) {
      setMentionedPages((prev) =>
        prev.includes(currentPath) ? prev : [...prev, currentPath]
      );
    }
  }, [isOpen, currentPath]);

  const insertMention = useCallback(
    (page: FlatPage) => {
      const before = input.slice(0, mentionStartPos);
      const after = input.slice(
        inputRef.current?.selectionStart || input.length
      );
      const newInput = `${before}@${page.title} ${after}`;
      setInput(newInput);
      setMentionedPages((prev) =>
        prev.includes(page.path) ? prev : [...prev, page.path]
      );
      setShowMentions(false);
      setMentionQuery("");
      setTimeout(() => {
        if (inputRef.current) {
          const pos = before.length + page.title.length + 2;
          inputRef.current.selectionStart = pos;
          inputRef.current.selectionEnd = pos;
          inputRef.current.focus();
        }
      }, 0);
    },
    [input, mentionStartPos]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(value);

    const textBefore = value.slice(0, pos);
    const atIndex = textBefore.lastIndexOf("@");

    if (atIndex !== -1) {
      const charBeforeAt = atIndex > 0 ? textBefore[atIndex - 1] : " ";
      if (charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) {
        const query = textBefore.slice(atIndex + 1);
        if (!query.includes(" ") && !query.includes("\n")) {
          setShowMentions(true);
          setMentionQuery(query);
          setMentionIndex(0);
          setMentionStartPos(atIndex);
          setMentionBrowsePath(null);
          return;
        }
      }
    }
    setShowMentions(false);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !currentPath) return;

    const instruction = input.trim();
    setInput("");
    const selectedMentionedPages = mentionedPages;
    setMentionedPages([]);

    try {
      const response = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "editor",
          pagePath: currentPath,
          userMessage: instruction,
          mentionedPaths: selectedMentionedPages,
          teamSlug: currentTeamSlug,
        }),
      });

      if (!response.ok) {
        setInput(instruction);
        setMentionedPages(selectedMentionedPages);
        return;
      }

      const data = await response.json();
      const conversation = data.conversation as { id: string; title: string };

      addEditorSession({
        id: conversation.id,
        sessionId: conversation.id,
        pagePath: currentPath,
        userMessage: instruction,
        prompt: conversation.title,
        timestamp: Date.now(),
        status: "running",
        reconnect: true,
      });
    } catch {
      setInput(instruction);
      setMentionedPages(selectedMentionedPages);
      return;
    }

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSessionEnd = useCallback(
    async (sessionId: string) => {
      const session = useAIPanelStore
        .getState()
        .editorSessions.find((s) => s.sessionId === sessionId);
      markSessionCompleted(sessionId);
      await loadPastSessions();

      // Signal the editor to reload if it's still showing this page
      const currentPagePath = useEditorStore.getState().currentPath;
      if (session && currentPagePath === session.pagePath) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("ai:page_updated", { detail: { path: session.pagePath } })
          );
        }, 500);
      }
    },
    [loadPastSessions, markSessionCompleted]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      const isBrowseMode = mentionQuery.length === 0;

      if (e.key === "Escape") {
        e.preventDefault();
        if (isBrowseMode && mentionBrowsePath !== null) {
          setMentionBrowsePath(getParentPath(mentionBrowsePath));
          setMentionIndex(0);
        } else {
          setShowMentions(false);
        }
        return;
      }

      if (isBrowseMode) {
        const browseItems = getBrowseItems(treeNodes, mentionBrowsePath);
        const hasBackRow = mentionBrowsePath !== null;
        const totalRows = (hasBackRow ? 1 : 0) + browseItems.length;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, totalRows - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (hasBackRow && mentionIndex === 0) {
            setMentionBrowsePath(getParentPath(mentionBrowsePath));
            setMentionIndex(0);
          } else {
            const item = browseItems[mentionIndex - (hasBackRow ? 1 : 0)];
            if (item) {
              if (item.isFolder) {
                setMentionBrowsePath(item.node.path);
                setMentionIndex(0);
              } else {
                insertMention({
                  path: item.node.path,
                  title: item.node.frontmatter?.title || item.node.name,
                });
              }
            }
          }
          return;
        }
      } else {
        if (filteredPages.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMentionIndex((i) => Math.min(i + 1, filteredPages.length - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setMentionIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insertMention(filteredPages[mentionIndex]);
            return;
          }
        }
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const togglePastExpanded = async (id: string) => {
    const wasExpanded = expandedPast.has(id);
    setExpandedPast((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (wasExpanded || pastSessionDetails[id]) {
      return;
    }

    try {
      const res = await fetch(`/api/agents/conversations/${id}`);
      if (!res.ok) return;
      const detail = (await res.json()) as ConversationDetail;
      setPastSessionDetails((prev) => ({
        ...prev,
        [id]: detail.transcript || detail.meta.summary || "",
      }));
    } catch {}
  };

  const formatTime = (ts: string | number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: string | number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (!isOpen) return null;

  const hasAnySessions =
    currentPageSessions.length > 0 ||
    pastSessions.length > 0 ||
    otherPageRunningSessions.length > 0;

  return (
    <div className="w-[480px] min-w-[420px] border-l border-border bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">
            AI Editor
          </span>
          {currentPath && (
            <span className="text-[11px] text-muted-foreground">
              {currentPath.split("/").pop()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasAnySessions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Clear all sessions"
              onClick={() => {
                clearAllSessions();
                setPastSessions([]);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" ref={scrollRef}>
        <div className={cn("p-3 space-y-3", currentPageSessions.length > 0 ? "flex-1 flex flex-col" : "")}>
          {!hasAnySessions && (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">
                Tell me how you&apos;d like to edit this page.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Use{" "}
                <span className="font-mono bg-muted px-1 rounded">@</span> to
                reference other pages as context.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Sessions persist across pages and show in Editor Agent.
              </p>
            </div>
          )}

          {/* Running sessions on OTHER pages */}
          {otherPageRunningSessions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                Running on other pages
              </div>
              {otherPageRunningSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    // Navigate to the page where this session is running
                    useAppStore.getState().setSection({ type: "page" });
                    useEditorStore.getState().loadPage(session.pagePath);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 border border-[#ffffff08] rounded-lg text-[12px] hover:bg-accent/30 transition-colors cursor-pointer text-left"
                >
                  <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                  <span className="truncate flex-1 text-muted-foreground">
                    {session.userMessage}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                    {session.pagePath.split("/").pop()}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(session.sessionId);
                    }}
                    className="text-muted-foreground/40 hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Past sessions for current page (collapsed by default) */}
          {pastSessions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                Previous Sessions
              </div>
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-[#ffffff08] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => togglePastExpanded(session.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
                  >
                    {expandedPast.has(session.id) ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-[12px] truncate flex-1">
                      {session.instruction}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      {formatDate(session.timestamp)}{" "}
                      {formatTime(session.timestamp)}
                    </span>
                  </button>
                  {expandedPast.has(session.id) && (
                    <div
                      className="border-t"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                      }}
                    >
                      <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
                        {pastSessionDetails[session.id] || session.summary || "(No output captured)"}
                      </pre>
                      <div
                        className="flex items-center gap-3 border-t px-3 py-1.5 text-[10px] text-muted-foreground/60"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {session.duration !== undefined && (
                          <span>
                            <Clock className="h-2.5 w-2.5 inline mr-1" />
                            {session.duration}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          {pastSessions.length > 0 && currentPageSessions.length > 0 && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 pt-2">
              Current Sessions
            </div>
          )}

          {/* Live sessions for current page — these render terminals */}
          {currentPageSessions.map((session, i) => (
            <div key={session.id} className={cn("space-y-2 flex flex-col", i === currentPageSessions.length - 1 ? "flex-1 min-h-0" : "")}>
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-accent/50 rounded-lg px-3 py-2 text-[13px] leading-relaxed flex-1">
                  {session.userMessage}
                </div>
                <button
                  onClick={() => {
                    removeSession(session.sessionId);
                  }}
                  className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-[200px] overflow-hidden rounded-lg border border-border/70 bg-background">
                <WebTerminal
                  sessionId={session.sessionId}
                  prompt={session.prompt}
                  displayPrompt={session.userMessage}
                  reconnect={session.reconnect}
                  themeSurface="page"
                  onClose={() => handleSessionEnd(session.sessionId)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All sessions on OTHER pages — keep WebTerminals mounted but hidden so connections stay alive */}
      {editorSessions
        .filter((s) => s.pagePath !== currentPath && s.status === "running")
        .map((session) => (
          <div
            key={`hidden-${session.id}`}
            style={{ width: 0, height: 0, overflow: "hidden", position: "absolute" }}
          >
            <WebTerminal
              sessionId={session.sessionId}
              prompt={session.prompt}
              displayPrompt={session.userMessage}
              reconnect={session.reconnect}
              themeSurface="page"
              onClose={() => handleSessionEnd(session.sessionId)}
            />
          </div>
        ))}

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        {mentionedPages.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {mentionedPages.map((pagePath) => {
              const page = allPages.find((p) => p.path === pagePath);
              return (
                <span
                  key={pagePath}
                  className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                >
                  <FileText className="h-2.5 w-2.5" />
                  {page?.title || pagePath}
                  <button
                    onClick={() =>
                      setMentionedPages((prev) =>
                        prev.filter((p) => p !== pagePath)
                      )
                    }
                    className="hover:text-destructive ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="relative">
          {showMentions && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto py-1 z-50">
              {mentionQuery.length === 0 ? (
                /* Browse mode */
                (() => {
                  const browseItems = getBrowseItems(treeNodes, mentionBrowsePath);
                  const hasBackRow = mentionBrowsePath !== null;
                  let rowIndex = 0;
                  return (
                    <>
                      {hasBackRow && (
                        <button
                          onClick={() => {
                            setMentionBrowsePath(getParentPath(mentionBrowsePath));
                            setMentionIndex(0);
                          }}
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors text-muted-foreground",
                            rowIndex++ === mentionIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50"
                          )}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[12px]">Back</span>
                        </button>
                      )}
                      {browseItems.length === 0 && (
                        <div className="px-3 py-2 text-[12px] text-muted-foreground/60">
                          No pages here
                        </div>
                      )}
                      {browseItems.map((item) => {
                        const idx = rowIndex++;
                        return (
                          <button
                            key={item.node.path}
                            onClick={() => {
                              if (item.isFolder) {
                                setMentionBrowsePath(item.node.path);
                                setMentionIndex(0);
                              } else {
                                insertMention({
                                  path: item.node.path,
                                  title: item.node.frontmatter?.title || item.node.name,
                                });
                              }
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors",
                              idx === mentionIndex
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                            )}
                          >
                            {item.isFolder ? (
                              <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium truncate">
                                {item.node.frontmatter?.title || item.node.name}
                              </p>
                              {item.isFolder && (
                                <p className="text-[10px] text-muted-foreground/60 truncate">
                                  {item.node.path}
                                </p>
                              )}
                            </div>
                            {item.isFolder && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </>
                  );
                })()
              ) : filteredPages.length > 0 ? (
                /* Search mode */
                filteredPages.slice(0, 10).map((page, i) => (
                  <button
                    key={page.path}
                    onClick={() => insertMention(page)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors",
                      i === mentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate">{page.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {page.path}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-[12px] text-muted-foreground/60">
                  No pages found
                </div>
              )}
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              currentPath
                ? "Ask anything... use @ to reference pages"
                : "Select a page first..."
            }
            disabled={!currentPath}
            rows={2}
            className={cn(
              "w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 pr-10",
              "text-[13px] leading-relaxed placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-ring",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <div className="absolute right-1.5 bottom-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Send"
              onClick={handleSubmit}
              disabled={!input.trim() || !currentPath}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
