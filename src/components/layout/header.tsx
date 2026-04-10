"use client";

import { Copy, Download, FileCode, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/stores/editor-store";
import { VersionHistory } from "@/components/editor/version-history";
import { HeaderActions } from "@/components/layout/header-actions";
import { PresenceAvatars } from "@/components/presence/presence-avatars";

export function Header() {
  const { frontmatter, content, currentPath } = useEditorStore();

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
    <header
      className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm transition-[padding] duration-200"
      style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-[13px] font-medium text-foreground truncate tracking-[-0.01em]">
          {frontmatter?.title || "Cabinet"}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        {/* Presence: online collaborator avatars — leftmost in the action bar */}
        <PresenceAvatars />

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
                const { toPng } = await import("html-to-image");
                const { jsPDF } = await import("jspdf");
                const imgData = await toPng(editorEl as HTMLElement, {
                  backgroundColor: "#ffffff",
                  pixelRatio: 2,
                });
                const img = new Image();
                img.src = imgData;
                await new Promise((resolve) => { img.onload = resolve; });
                const pdf = new jsPDF("p", "mm", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (img.height * pdfWidth) / img.width;
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

        {/* Global actions: Search, Terminal, AI, Theme */}
        <HeaderActions />
      </div>
    </header>
  );
}
