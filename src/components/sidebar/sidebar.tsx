"use client";

import { useEffect, useState } from "react";
import {
  PanelLeftClose,
  PanelLeft,
  Settings,
  Users,
  Target,
  MessageSquare,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TreeView } from "./tree-view";
import { NewPageDialog } from "./new-page-dialog";
import { useAppStore } from "@/stores/app-store";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return { isMobile, mounted };
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

export function Sidebar() {
  const { isMobile, mounted } = useIsMobile();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);

  useEffect(() => {
    if (mounted && isMobile) setCollapsed(true);
  }, [mounted, isMobile, setCollapsed]);

  const desktopClass = collapsed ? "w-0 overflow-hidden" : "w-[280px] min-w-[280px]";
  const mobileClass = cn(
    "fixed left-0 top-0 bottom-0 z-40",
    collapsed ? "w-0 overflow-hidden" : "w-[280px]"
  );

  return (
    <>
      {mounted && isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        suppressHydrationWarning
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-200 h-screen overflow-hidden",
          mounted && isMobile ? mobileClass : desktopClass
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-semibold tracking-[-0.02em]">
            Cabinet
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
        <TreeView />
        <Separator />

        {/* Team section */}
        <div className="px-3 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Team
          </p>
          <NavButton
            icon={Users}
            label="Agents"
            active={section.type === "agents" || section.type === "agent"}
            onClick={() => setSection({ type: "agents" })}
          />
          <NavButton
            icon={Target}
            label="Missions"
            active={section.type === "missions"}
            onClick={() => setSection({ type: "missions" })}
          />
          <NavButton
            icon={MessageSquare}
            label="Chat"
            active={section.type === "chat"}
            onClick={() => setSection({ type: "chat" })}
          />
        </div>

        {/* System section */}
        <div className="px-3 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            System
          </p>
          <NavButton
            icon={Activity}
            label="Activity"
            active={section.type === "activity"}
            onClick={() => setSection({ type: "activity" })}
          />
          <NavButton
            icon={Settings}
            label="Settings"
            active={section.type === "settings"}
            onClick={() => setSection({ type: "settings" })}
          />
        </div>

        <div className="flex-1" />
        <div className="p-2">
          <NewPageDialog />
        </div>
      </aside>
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 z-10 h-7 w-7",
            isMobile ? "left-3 z-50" : "left-2"
          )}
          onClick={() => setCollapsed(false)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
