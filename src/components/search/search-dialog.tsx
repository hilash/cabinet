"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, FileText, Tag, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  tags: string[];
  modified?: string;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { selectPage } = useTreeStore();
  const { loadPage } = useEditorStore();

  // Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback(
    async (q: string, tag: string) => {
      if (!q.trim() && !tag) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q);
        if (tag) params.set("tag", tag);
        const res = await fetch(`/api/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setAiResult("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, tagFilter), 200);
  };

  const handleSelect = (result: SearchResult) => {
    selectPage(result.path);
    loadPage(result.path);
    setOpen(false);
    setQuery("");
    setTagFilter("");
    setResults([]);
  };

  const handleSetTag = (tag: string) => {
    setTagFilter(tag);
    search(query, tag);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  // Collect unique tags from results for quick filtering
  const allTags = Array.from(
    new Set(results.flatMap((r) => r.tags))
  ).slice(0, 8);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery("");
          setTagFilter("");
          setResults([]);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-[13px] h-11"
            autoFocus
          />
        </div>

        {/* Active tag filter */}
        {tagFilter && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
              {tagFilter}
              <button onClick={() => handleSetTag("")}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        )}

        {(results.length > 0 || loading) && (
          <div className="max-h-[300px] overflow-y-auto py-1">
            {loading && results.length === 0 && (
              <div className="px-4 py-3 text-[13px] text-muted-foreground">
                Searching...
              </div>
            )}
            {results.map((result, i) => (
              <button
                key={result.path}
                onClick={() => handleSelect(result)}
                className={cn(
                  "flex items-start gap-3 w-full px-3 py-2.5 text-left transition-colors",
                  i === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">
                    {result.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {result.snippet}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground/50">
                      {result.path}
                    </span>
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetTag(tag);
                        }}
                        className="text-[9px] bg-muted px-1 py-0.5 rounded hover:bg-primary/10 hover:text-primary cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tag suggestions */}
        {!tagFilter && allTags.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border">
            <Tag className="h-3 w-3 text-muted-foreground/50" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSetTag(tag)}
                className="text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground space-y-3">
            <p>No results found</p>
            {!aiSearching && !aiResult && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  setAiSearching(true);
                  try {
                    const res = await fetch("/api/agents/headless", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: `Search the knowledge base at /data for content related to: "${query}". List any relevant pages, sections, or information you find. Be concise.`,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setAiResult(data.output || "No relevant content found.");
                    }
                  } catch {
                    setAiResult("AI search failed.");
                  } finally {
                    setAiSearching(false);
                  }
                }}
              >
                <Sparkles className="h-3 w-3" />
                Ask AI
              </Button>
            )}
            {aiSearching && (
              <div className="flex items-center justify-center gap-2 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Searching with AI...
              </div>
            )}
            {aiResult && (
              <div className="text-left bg-muted/50 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {aiResult}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] text-muted-foreground/50">
          <span>Navigate with arrow keys</span>
          <span>Enter to select</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
