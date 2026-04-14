"use client";

import { ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { HeaderActions } from "@/components/layout/header-actions";

interface WebsiteViewerProps {
  path: string;
  title: string;
  fullscreen?: boolean;
  onExit?: () => void;
}

export function WebsiteViewer({ path, title, fullscreen, onExit }: WebsiteViewerProps) {
  const iframeSrc = `/api/assets/${path}/index.html`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2">
          {fullscreen && onExit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={onExit}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
          <span className="text-[13px] font-medium">{title}</span>
          <span className="text-xs text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
            {fullscreen ? "App" : "Embedded Website"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => window.open(iframeSrc, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </Button>
          <HeaderActions />
        </div>
      </div>

      {/* Iframe */}
      <iframe
        src={iframeSrc}
        className="flex-1 w-full border-0 bg-white"
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
