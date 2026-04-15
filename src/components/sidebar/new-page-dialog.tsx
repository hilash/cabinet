"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@multica/ui/components/ui/dialog";
import { Input } from "@multica/ui/components/ui/input";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";

export function NewPageDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const { createPage } = useTreeStore();
  const { loadPage } = useEditorStore();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      // Create at root level or under the currently selected directory
      const parentPath = "";
      await createPage(parentPath, title.trim());
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      loadPage(slug);
      setTitle("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create page:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        data-new-page-trigger
        className="flex items-center gap-2 w-full text-sm px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        新建页面
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create 新建页面</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="页面标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!title.trim() || creating}>
            {creating ? "创建中..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
