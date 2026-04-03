"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TreeNode } from "@/types";

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

interface MentionInputProps {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  onSubmit: (text: string, mentionedPages: string[]) => void;
}

export function MentionInput({
  placeholder = "Ask something... use @ to reference pages",
  disabled = false,
  sending = false,
  onSubmit,
}: MentionInputProps) {
  const [input, setInput] = useState("");
  const [mentionedPages, setMentionedPages] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // @ mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [allPages, setAllPages] = useState<FlatPage[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState(0);

  // Load pages for @ mentions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/tree");
        if (res.ok) {
          const tree = await res.json();
          setAllPages(flattenTree(tree));
        }
      } catch {}
    };
    load();
  }, []);

  const filteredPages = allPages.filter(
    (p) =>
      p.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(mentionQuery.toLowerCase())
  );

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
          return;
        }
      }
    }
    setShowMentions(false);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    const pages = [...mentionedPages];
    setMentionedPages([]);
    onSubmit(text, pages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredPages.length > 0) {
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
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border p-3">
      {/* Mentioned pages pills */}
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
        {/* Mention dropdown */}
        {showMentions && filteredPages.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto py-1 z-50">
            {filteredPages.slice(0, 10).map((page, i) => (
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
                  <p className="text-[12px] font-medium truncate">
                    {page.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {page.path}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
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
            disabled={disabled || sending || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Utility: fetch content for mentioned pages and build a context block */
export async function fetchMentionedPagesContext(
  mentionedPages: string[]
): Promise<string> {
  if (mentionedPages.length === 0) return "";

  const pageContents = await Promise.all(
    mentionedPages.map(async (pagePath) => {
      try {
        const res = await fetch(`/api/pages/${pagePath}`);
        if (res.ok) {
          const data = await res.json();
          return `--- ${data.frontmatter?.title || pagePath} (${pagePath}) ---\n${data.content}`;
        }
      } catch {}
      return null;
    })
  );
  const validContents = pageContents.filter(Boolean);
  if (validContents.length > 0) {
    return `\n\nReferenced pages:\n${validContents.join("\n\n")}`;
  }
  return "";
}
