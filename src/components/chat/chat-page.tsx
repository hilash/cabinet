"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { ChannelList } from "./channel-list";
import { ChannelView } from "./channel-view";

export function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  return (
    <div className="flex-1 flex overflow-hidden">
      <ChannelList
        selectedChannel={selectedChannel}
        onSelect={setSelectedChannel}
      />
      {selectedChannel ? (
        <ChannelView channelSlug={selectedChannel} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground mt-3">
              Select a channel to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
