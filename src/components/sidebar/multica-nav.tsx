"use client";

import {
  Bot,
  FolderKanban,
  Inbox,
  ListTodo,
  Rocket,
  Sparkles,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const navItems = [
  { label: "Inbox", type: "inbox", icon: Inbox },
  { label: "My Issues", type: "my-issues", icon: ListTodo },
  { label: "Issues", type: "issues", icon: Workflow },
  { label: "Projects", type: "projects", icon: FolderKanban },
  { label: "Agents", type: "agents-multica", icon: Bot },
  { label: "Runtimes", type: "runtimes", icon: Rocket },
  { label: "Skills", type: "skills", icon: Sparkles },
] as const;

export function MulticaNav() {
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);

  return (
    <div className="px-2 py-3">
      <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Multica
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            section.type === item.type ||
            (item.type === "issues" && section.type === "issue-detail") ||
            (item.type === "projects" && section.type === "project-detail") ||
            (item.type === "agents-multica" && section.type === "agent-multica");

          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setSection({ type: item.type })}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                isActive && "bg-accent text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
