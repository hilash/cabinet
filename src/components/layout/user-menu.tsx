"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAppStore } from "@/stores/app-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);

  if (!session?.user) return null;

  const name = session.user.name ?? session.user.email ?? "User";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = () =>
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/login") },
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors w-full text-left">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={name}
            className="h-6 w-6 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
            {initials}
          </div>
        )}
        <span className="text-[12px] text-muted-foreground truncate flex-1">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" side="top">
        <div className="px-2 py-1.5">
          <p className="text-[12px] font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {currentTeamSlug && (
            <DropdownMenuItem
              onClick={() => router.push(`/teams/${currentTeamSlug}/settings`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-3.5 w-3.5" />
              Team settings
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 text-red-500 focus:text-red-500"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
