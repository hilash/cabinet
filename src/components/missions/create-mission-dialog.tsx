"use client";

import { useState } from "react";
import { X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateMissionDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: () => void;
}) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: goal.trim(),
          outputPath: outputPath.trim() || undefined,
        }),
      });
      if (res.ok) {
        onCreate();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-xl w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-semibold">New Mission</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Launch podcast pipeline"
              className="h-9"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what this mission should accomplish..."
              className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground dark:bg-input/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium">
              Output path{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Input
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="/podcasts/"
              className="h-9"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            <Rocket className="h-3.5 w-3.5" />
            {creating ? "Creating..." : "Create Mission"}
          </Button>
        </div>
      </div>
    </div>
  );
}
