"use client";

import { authClient } from "@/lib/auth-client";
import { usePresenceStore } from "@/stores/presence-store";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PresenceData } from "@/lib/presence/presence-store";

function followUser(user: PresenceData) {
  if (!user.currentPath) return;
  const { selectPage, expandPath } = useTreeStore.getState();
  const parts = user.currentPath.split("/");
  for (let i = 1; i < parts.length; i++) {
    expandPath(parts.slice(0, i).join("/"));
  }
  selectPage(user.currentPath);
  useEditorStore.getState().loadPage(user.currentPath);
  if (user.scrollY !== undefined) {
    setTimeout(() => {
      document
        .querySelector(".flex-1.overflow-y-auto")
        ?.scrollTo(0, user.scrollY!);
    }, 300);
  }
}

function UserAvatar({ user }: { user: PresenceData }) {
  const now = Date.now();
  const isOnline = now - user.lastSeen < 30_000;
  const name = user.name;
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const pageName = user.currentPath?.split("/").pop() ?? null;

  return (
    <Tooltip>
      <TooltipTrigger
        className="relative focus:outline-none rounded-full"
        onClick={() => isOnline && followUser(user)}
        style={{ cursor: isOnline ? "pointer" : "default" }}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={name}
            className="h-7 w-7 rounded-full object-cover border-2 transition-all duration-200"
            style={{
              borderColor: user.color,
              filter: isOnline ? "none" : "grayscale(100%)",
              opacity: isOnline ? 1 : 0.55,
            }}
          />
        ) : (
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 transition-all duration-200"
            style={{
              backgroundColor: user.color,
              borderColor: user.color,
              filter: isOnline ? "none" : "grayscale(100%)",
              opacity: isOnline ? 1 : 0.55,
            }}
          >
            {initials}
          </div>
        )}
        {/* Online indicator dot */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        <p className="font-medium">{name}</p>
        {isOnline && pageName && (
          <p className="text-[11px] opacity-75">Editing: {pageName}</p>
        )}
        {!isOnline && <p className="text-[11px] opacity-75">Recently offline</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function PresenceAvatars() {
  const { data: session } = authClient.useSession();
  const remoteUsers = usePresenceStore((s) => s.remoteUsers);

  if (!session?.user) return null;

  // Show others (not self), most recently seen first
  const others = remoteUsers
    .filter((u) => u.userId !== session.user.id)
    .sort((a, b) => b.lastSeen - a.lastSeen);

  if (others.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-1.5 mr-1">
        {others.map((user) => (
          <UserAvatar key={user.userId} user={user} />
        ))}
      </div>
    </TooltipProvider>
  );
}
