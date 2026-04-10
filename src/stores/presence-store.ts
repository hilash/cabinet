import { create } from "zustand";
import type { PresenceData, PresenceEvent } from "@/lib/presence/presence-store";

interface PresenceState {
  remoteUsers: PresenceData[];
  applyEvent: (event: PresenceEvent) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  remoteUsers: [],

  applyEvent: (event) => {
    set((state) => {
      if (event.type === "snapshot") {
        return { remoteUsers: event.users };
      }
      if (event.type === "update") {
        const others = state.remoteUsers.filter(
          (u) => u.userId !== event.user.userId
        );
        return { remoteUsers: [...others, event.user] };
      }
      if (event.type === "leave") {
        return {
          remoteUsers: state.remoteUsers.filter(
            (u) => u.userId !== event.userId
          ),
        };
      }
      return state;
    });
  },
}));
