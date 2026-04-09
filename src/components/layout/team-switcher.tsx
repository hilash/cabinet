"use client";

import { ChevronDown, Plus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function TeamSwitcher() {
  const router = useRouter();
  const teams = useAppStore((s) => s.teams);
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
  const setCurrentTeam = useAppStore((s) => s.setCurrentTeam);

  if (teams.length === 0) return null;

  const current = teams.find((t) => t.slug === currentTeamSlug) ?? teams[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent transition-colors text-[13px] font-medium max-w-[160px] truncate">
        <span className="truncate">{current?.name ?? "Cabinet"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuGroup>
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => setCurrentTeam(team.slug)}
              className="flex items-center gap-2"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  team.slug === currentTeamSlug ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{team.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/teams/new")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
