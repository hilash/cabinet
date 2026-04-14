"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, Code2, Eye, Copy, Check } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { HeaderActions } from "@/components/layout/header-actions";

interface MermaidViewerProps {
  path: string;
  title: string;
}

export function MermaidViewer({ path, title }: MermaidViewerProps) {
  const [source, setSource] = useState("");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  const assetUrl = `/api/assets/${path}`;
  const filename = path.split("/").pop() || path;

  const fetchAndRender = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(assetUrl);
      if (!res.ok) throw new Error("Failed to fetch file");
      const text = await res.text();
      setSource(text);

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
        securityLevel: "loose",
      });

      const id = `mermaid-${++renderIdRef.current}`;
      const { svg: rendered } = await mermaid.render(id, text.trim());
      setSvg(rendered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render diagram");
    } finally {
      setLoading(false);
    }
  }, [assetUrl]);

  useEffect(() => {
    void fetchAndRender();
  }, [fetchAndRender]);

  const copySource = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{title}</span>
          <span className="text-xs text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
            MERMAID
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1.5 text-xs ${showSource ? "bg-muted" : ""}`}
            onClick={() => setShowSource((v) => !v)}
          >
            {showSource ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
            {showSource ? "Diagram" : "Source"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={copySource}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {svg && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={downloadSvg}
            >
              <Download className="h-3.5 w-3.5" />
              SVG
            </Button>
          )}
          <HeaderActions />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Rendering diagram...
          </div>
        ) : showSource ? (
          <pre className="p-4 text-[13px] leading-relaxed font-mono bg-[#1e1e1e]">
            <code>
              {source.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="inline-block w-12 pr-4 text-right text-[#858585] select-none shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[#d4d4d4] flex-1">{line || "\n"}</span>
                </div>
              ))}
            </code>
          </pre>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-sm">
            <p className="text-red-500">Failed to render diagram</p>
            <p className="text-muted-foreground text-xs max-w-md text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setShowSource(true)}>
              View source
            </Button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex items-center justify-center p-8 min-h-full [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
}
