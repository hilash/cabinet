"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Sparkles, Code2 } from "lucide-react";
import { editorExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";
import { SlashCommands } from "./slash-commands";
import { useEditorStore } from "@/stores/editor-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { markdownToHtml } from "@/lib/markdown/to-html";
import { htmlToMarkdown } from "@/lib/markdown/to-markdown";

async function uploadFile(pagePath: string, file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`/api/upload/${pagePath}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  } catch {
    return null;
  }
}

export function KBEditor() {
  const { currentPath, content, saveStatus, frontmatter } = useEditorStore();
  const isRtl = frontmatter?.dir === "rtl";
  const { open: openAI, clearMessages } = useAIPanelStore();
  const isLoadingRef = useRef(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");

  const handleUpdate = useCallback(
    ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
      if (isLoadingRef.current || !editor) return;
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      useEditorStore.getState().updateContent(md);
    },
    []
  );

  const handlePasteOrDrop = useCallback(
    async (files: FileList) => {
      const pagePath = useEditorStore.getState().currentPath;
      if (!pagePath) return;

      for (const file of Array.from(files)) {
        const url = await uploadFile(pagePath, file);
        if (!url) continue;
        // For now insert via the editor reference stored separately
        // This is handled by the editorProps below
      }
    },
    []
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[calc(100vh-12rem)] px-4 sm:px-8 py-6 max-w-3xl mx-auto",
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;

        const pagePath = useEditorStore.getState().currentPath;
        if (!pagePath) return false;

        // Handle file paste
        for (const file of Array.from(files)) {
          uploadFile(pagePath, file).then((url) => {
            if (!url || !editor) return;
            if (file.type.startsWith("image/")) {
              editor.chain().focus().setImage({ src: url, alt: file.name }).run();
            }
          });
        }
        return true;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const pagePath = useEditorStore.getState().currentPath;
        if (!pagePath) return false;

        event.preventDefault();
        for (const file of Array.from(files)) {
          uploadFile(pagePath, file).then((url) => {
            if (!url || !editor) return;
            if (file.type.startsWith("image/")) {
              editor.chain().focus().setImage({ src: url, alt: file.name }).run();
            }
          });
        }
        return true;
      },
    },
    immediatelyRender: false,
  });

  // When content updates from store (after loadPage), set it in editor
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editor || !currentPath) return;
    // Skip if content hasn't actually changed (same path, dirty edit)
    if (useEditorStore.getState().isDirty && currentPath === prevPathRef.current) return;
    prevPathRef.current = currentPath;

    const setContent = async () => {
      isLoadingRef.current = true;
      const html = await markdownToHtml(content, currentPath);
      editor.commands.setContent(html);
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 50);
    };

    setContent();
  }, [editor, content, currentPath]);

  const handleOpenAI = () => {
    clearMessages();
    openAI();
  };


  if (!currentPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium tracking-[-0.02em]">
            No page selected
          </p>
          <p className="text-sm text-muted-foreground/70">
            Select a page from the sidebar or create a new one
          </p>
        </div>
      </div>
    );
  }

  const toggleSourceMode = async () => {
    if (!sourceMode) {
      // Switching TO source mode — grab current markdown
      setSourceText(useEditorStore.getState().content);
      setSourceMode(true);
    } else {
      // Switching FROM source mode — apply changes
      useEditorStore.getState().updateContent(sourceText);
      if (editor) {
        isLoadingRef.current = true;
        const html = await markdownToHtml(sourceText, currentPath ?? undefined);
        editor.commands.setContent(html);
        setTimeout(() => { isLoadingRef.current = false; }, 50);
      }
      setSourceMode(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1">
          {!sourceMode && <EditorToolbar editor={editor} />}
        </div>
        <button
          onClick={toggleSourceMode}
          className={`flex items-center gap-1.5 px-3 py-1 mr-2 text-[11px] rounded-md transition-colors border border-border ${
            sourceMode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Code2 className="h-3 w-3" />
          {sourceMode ? "Preview" : "Source"}
        </button>
      </div>

      {sourceMode ? (
        <div className="flex-1 overflow-y-auto p-4" dir={isRtl ? "rtl" : undefined}>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full h-full min-h-[calc(100vh-12rem)] bg-transparent font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto relative" dir={isRtl ? "rtl" : undefined}>
          <EditorContent editor={editor} />
          <SlashCommands editor={editor} />

          {/* AI Edit Prompt */}
          <div className="max-w-3xl mx-auto px-8 pb-8">
            <button
              onClick={handleOpenAI}
              className="group flex items-center gap-2 text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              <span>How would you like to edit this page?</span>
            </button>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-end px-4 py-1 border-t border-border text-xs text-muted-foreground/60">
        {saveStatus === "saving" && "Saving..."}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "error" && "Save failed"}
      </div>

    </div>
  );
}
