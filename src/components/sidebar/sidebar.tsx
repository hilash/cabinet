"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeft, Settings } from "lucide-react";
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
        <div className="p-2 flex items-center gap-1">
          <div className="flex-1">
            <NewPageDialog />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0", section.type === "settings" && "text-primary")}
            onClick={() => setSection({ type: "settings" })}
          >
            <Settings className="h-4 w-4" />
          </Button>
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
