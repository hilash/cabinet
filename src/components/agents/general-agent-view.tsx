"use client";

import { useState } from "react";
import { Terminal, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GeneralAgentView() {
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/agents/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setOutput(data.output || "No output");
      }
    } catch { /* ignore */ }
    setSending(false);
    setPrompt("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Terminal className="h-5 w-5 text-blue-400" />
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">General</h2>
          <p className="text-[11px] text-muted-foreground">Manual sessions with the default provider — no persona, no heartbeat</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {output ? (
            <pre className="text-[13px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/90">
              {output}
            </pre>
          ) : (
            <p className="text-muted-foreground text-[13px]">
              Send a prompt below to run the default provider in headless mode, or use the terminal (Cmd+`) for interactive sessions.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the default provider something..."
            className="flex-1 px-3 py-1.5 text-[13px] rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={sending}
          />
          <Button size="sm" className="h-8 gap-1" onClick={handleSend} disabled={sending || !prompt.trim()}>
            <Send className="h-3.5 w-3.5" />
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
