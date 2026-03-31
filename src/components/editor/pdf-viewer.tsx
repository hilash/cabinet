"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  path: string;
  title: string;
}

export function PdfViewer({ path, title }: PdfViewerProps) {
  const pdfSrc = `/api/assets/${path}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{title}</span>
          <span className="text-xs text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
            PDF
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => window.open(pdfSrc, "_blank")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </Button>
      </div>
      <iframe
        src={pdfSrc}
        className="flex-1 w-full border-0"
        title={title}
      />
    </div>
  );
}
