import { io, type Socket } from "socket.io-client";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * The socket connects straight to the API origin (the Next.js proxy drops
 * WebSocket upgrades), so the session cookie may not travel. Exchange it via
 * the same-origin proxy for a short-lived, single-purpose handshake token.
 */
async function fetchSocketToken(): Promise<string> {
  try {
    const response = await fetch("/backend/api/v1/socket-token", { credentials: "same-origin" });
    if (!response.ok) return "";
    const body = (await response.json()) as { token?: string };
    return body.token ?? "";
  } catch {
    return "";
  }
}

let socket: Socket | null = null;

/**
 * Shared Socket.IO client for the whole tab. The auth callback re-fetches the
 * token on every (re)connect, so long-lived tabs recover from expiry by
 * themselves.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_ORIGIN, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: false,
    auth: (callback) => {
      void fetchSocketToken().then((token) => callback({ token }));
    },
  });
  return socket;
}

/** Return the shared socket, connecting it on first use. */
export function ensureSocket(): Socket {
  const instance = getSocket();
  if (!instance.connected && !instance.active) instance.connect();
  return instance;
}

export function socketErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) return detail;
  }
  return "Connection problem — retrying…";
}
