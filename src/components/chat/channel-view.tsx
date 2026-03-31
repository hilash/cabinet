"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Hash,
  Send,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  channelSlug: string;
  fromId: string;
  fromType: "agent" | "human" | "system";
  content: string;
  pinned: boolean;
  createdAt: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChannelView({ channelSlug }: { channelSlug: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelName, setChannelName] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/channels/${channelSlug}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setChannelName(data.channel?.name || channelSlug);
      }
    } catch {
      // ignore
    }
  }, [channelSlug]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/chat/channels/${channelSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromId: "human",
          fromType: "human",
          content: input.trim(),
        }),
      });
      setInput("");
      refresh();
    } finally {
      setSending(false);
    }
  };

  const handlePin = async (messageId: string) => {
    await fetch(`/api/chat/channels/${channelSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", messageId }),
    });
    refresh();
  };

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Channel header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[14px] font-semibold">{channelName}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[13px] text-muted-foreground">
                No messages in #{channelName} yet
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Start the conversation
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const date = formatDate(msg.createdAt);
            const showDate = date !== lastDate;
            lastDate = date;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {date}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="group flex gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-accent/30">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {msg.fromType === "human"
                      ? "You"
                      : msg.fromId.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold">
                        {msg.fromType === "human" ? "You" : msg.fromId}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.pinned && (
                        <Pin className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                    onClick={() => handlePin(msg.id)}
                  >
                    <Pin className={cn("h-3 w-3", msg.pinned && "text-yellow-500")} />
                  </Button>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channelName}...`}
            className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            variant="default"
            size="icon-sm"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
