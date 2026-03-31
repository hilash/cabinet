"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Hash,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Channel {
  slug: string;
  name: string;
  members: string[];
  lastMessageAt: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChannelList({
  selectedChannel,
  onSelect,
}: {
  selectedChannel: string | null;
  onSelect: (slug: string) => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const slug = newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    try {
      await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: newName.trim(), members: [] }),
      });
      setNewName("");
      setShowCreate(false);
      refresh();
      onSelect(slug);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-[200px] min-w-[200px] border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[12px] font-semibold">Channels</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>

      {showCreate && (
        <div className="px-2 py-2 border-b border-border flex gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="channel-name"
            className="h-7 text-[11px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button
            variant="outline"
            size="icon-xs"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {channels.map((ch) => (
            <button
              key={ch.slug}
              onClick={() => onSelect(ch.slug)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors text-left",
                selectedChannel === ch.slug
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Hash className="h-3 w-3 shrink-0" />
              <span className="flex-1 truncate">{ch.name}</span>
              {ch.lastMessageAt && (
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {timeAgo(ch.lastMessageAt)}
                </span>
              )}
            </button>
          ))}
          {channels.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              No channels yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
