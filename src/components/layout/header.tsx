"use client";

import { Sparkles, Copy, Download, Search, FileCode, Terminal, FileDown, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/stores/editor-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { useAppStore } from "@/stores/app-store";
import { VersionHistory } from "@/components/editor/version-history";
import { ThemePicker } from "@/components/layout/theme-picker";
import { cn } from "@/lib/utils";

export function Header() {
  const { frontmatter, content, currentPath } = useEditorStore();
  const { isOpen, toggle } = useAIPanelStore();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const { terminalOpen, toggleTerminal } = useAppStore();

  const handleCopyMarkdown = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
  };

  const handleCopyHTML = async () => {
    if (!content) return;
    // Convert markdown to HTML for clipboard
    const res = await fetch(`/api/pages/${currentPath}`);
    if (res.ok) {
      const data = await res.json();
      // Use the remark pipeline via a simple conversion
      const { markdownToHtml } = await import("@/lib/markdown/to-html");
      const html = await markdownToHtml(data.content);
      await navigator.clipboard.writeText(html);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!content || !frontmatter) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${frontmatter.title || "page"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setSidebarCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-[13px] font-medium text-foreground truncate tracking-[-0.01em]">
          {frontmatter?.title || "Cabinet"}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        {/* Search hint */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hidden sm:flex"
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <kbd className="pointer-events-none text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
            ⌘K
          </kbd>
        </Button>

        {/* Export dropdown */}
        {currentPath && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
              <Download className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyMarkdown}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyHTML}>
                <FileCode className="h-4 w-4 mr-2" />
                Copy as HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                Download .md
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const editorEl = document.querySelector(".tiptap");
                if (!editorEl) return;
                const html2canvas = (await import("html2canvas")).default;
                const { jsPDF } = await import("jspdf");
                const canvas = await html2canvas(editorEl as HTMLElement, {
                  backgroundColor: "#ffffff",
                  scale: 2,
                });
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${frontmatter?.title || "page"}.pdf`);
              }}>
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Version history */}
        {currentPath && <VersionHistory />}

        {/* Terminal toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", terminalOpen && "text-primary")}
          onClick={toggleTerminal}
        >
          <Terminal className="h-4 w-4" />
        </Button>

        {/* AI toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isOpen && "text-primary")}
          onClick={toggle}
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        {/* Theme picker — click to toggle, long-press for menu */}
        <ThemePicker />
      </div>
    </header>
  );
}
