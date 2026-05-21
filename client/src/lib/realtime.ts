import SockJS from "sockjs-client";
import api from "./api";

export const REALTIME_NOTIFICATION_EVENT = "ksp:realtime-notification";
export const INCOMING_CALL_EVENT = "ksp:incoming-call";
export const PENDING_CALL_STORAGE_KEY = "ksp_pending_call";

type RealtimeNotificationType = "message" | "call" | "mention" | "system" | "like" | "comment" | "follow" | "badge" | "report";

export interface RealtimeNotificationDetail {
  id?: string;
  type: RealtimeNotificationType;
  title: string;
  description?: string;
  createdAt?: string;
  link?: string;
  payload?: unknown;
}

export function createSockJsConnection() {
  return new SockJS(api.getWebSocketUrl(), undefined, {
    transports: ["websocket"],
  });
}

export function emitRealtimeNotification(detail: RealtimeNotificationDetail) {
  window.dispatchEvent(
    new CustomEvent<RealtimeNotificationDetail>(REALTIME_NOTIFICATION_EVENT, {
      detail: {
        createdAt: new Date().toISOString(),
        ...detail,
      },
    }),
  );
}

export function emitIncomingCall(detail: unknown) {
  window.dispatchEvent(new CustomEvent(INCOMING_CALL_EVENT, { detail }));
}

export function savePendingCall(call: unknown) {
  try {
    sessionStorage.setItem(
      PENDING_CALL_STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), call }),
    );
  } catch {
    // sessionStorage can be disabled in private contexts.
  }
}

export function readPendingCall<T = any>(maxAgeMs = 120000): T | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CALL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > maxAgeMs) {
      sessionStorage.removeItem(PENDING_CALL_STORAGE_KEY);
      return null;
    }
    return parsed.call || null;
  } catch {
    return null;
  }
}

export function clearPendingCall() {
  try {
    sessionStorage.removeItem(PENDING_CALL_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
