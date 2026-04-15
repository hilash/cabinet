"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { ConversationSessionView } from "@/components/agents/conversation-session-view";
import { Button } from "@/components/ui/button";
import type { ConversationDetail, ConversationStatus } from "@/types/conversations";
import { openArtifactPath } from "@/lib/navigation/open-artifact-path";

function StatusDot({ status }: { status: ConversationStatus }) {
  if (status === "running") {
    return <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>;
  }
  if (status === "completed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />;
  }
  if (status === "failed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-destructive" />;
  }
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />;
}

function formatRelative(iso?: string): string {
  if (!iso) return "just now";
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function TaskDetailPanel() {
  const conversation = useAppStore((s) => s.taskPanelConversation);
  const setTaskPanelConversation = useAppStore((s) => s.setTaskPanelConversation);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);

  if (!conversation) return null;
  const activeConversation = detail?.meta.id === conversation.id ? detail.meta : conversation;

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border/70 bg-background">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot status={activeConversation.status} />
            <p className="truncate text-[13px] font-medium text-foreground">
              {activeConversation.title}
            </p>
          </div>
          <p className="mt-0.5 truncate pl-4 text-[11px] text-muted-foreground">
            {startCase(activeConversation.agentSlug)}
            {" · "}
            {formatRelative(activeConversation.startedAt)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={() => setTaskPanelConversation(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ConversationSessionView
          conversation={conversation}
          onDetailChange={setDetail}
          onOpenArtifact={(artifactPath) => {
            void openArtifactPath(artifactPath, { type: "page" });
          }}
        />
      </div>
    </div>
  );
}
