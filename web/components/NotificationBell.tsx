"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { ensureSocket } from "@/lib/socket";

/** Unread counter for the nav badge. Polling is just a safety net — the socket
 * stream below is what keeps it fresh in real time. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: api.unreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Subscribe once per page (mount it in the nav) to live notification pushes:
 * bumps the badge immediately and refreshes any open Inbox / tracking lists.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = ensureSocket();
    const onNotification = () => {
      queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({
        count: (old?.count ?? 0) + 1,
      }));
      void queryClient.invalidateQueries({ queryKey: ["inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["contributions"] });
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [queryClient]);
}

export function UnreadBadge() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-heart/100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
