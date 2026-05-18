import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../lib/authContext";
import { localStorage_service } from "../lib/localStorage";
import {
  clearPendingCall,
  createSockJsConnection,
  emitIncomingCall,
  emitRealtimeNotification,
  savePendingCall,
} from "../lib/realtime";

function safeParse(data: any) {
  if (!data) return null;
  if (typeof data === "object") return data;
  const value = String(data).trim();
  if (!value || value === "undefined" || value === "null") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toId(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

export function GlobalRealtime() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stompRef = useRef<Client | null>(null);
  const pendingCallRef = useRef<any | null>(null);
  const notifiedCallIdsRef = useRef<Set<string>>(new Set());
  const realtimeMessageIdsRef = useRef<Set<string>>(new Set());
  const processedCallSignalsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentUserId = toId(user?.id);
    const token = localStorage_service.getAuthToken();
    if (!currentUserId || !token) return;

    if (stompRef.current?.active) stompRef.current.deactivate();

    const openMessages = () => navigate("/tin-nhan");

    const mergePendingCall = (event: any) => {
      const callId = toId(event?.callId);
      if (!callId) return null;

      const previous = pendingCallRef.current?.callId === callId ? pendingCallRef.current : {};
      const next = { ...previous, ...event };

      if (event.type === "offer") {
        next.type = previous.type || "start";
        next.offer = safeParse(event.signalData);
      }

      if (event.type === "ice-candidate" || event.type === "ice") {
        next.type = previous.type || "start";
        const candidate = safeParse(event.signalData);
        next.candidates = [...(previous.candidates || []), ...(candidate ? [candidate] : [])];
      }

      pendingCallRef.current = next;
      savePendingCall(next);
      emitIncomingCall(next);
      return next;
    };

    const client = new Client({
      webSocketFactory: () => createSockJsConnection(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => {
        const subscribeUserQueue = (queue: string, handler: (frame: any) => void) => {
          [`/user/queue/${queue}`, `/user/${currentUserId}/queue/${queue}`].forEach((destination) => {
            client.subscribe(destination, handler);
          });
        };

        subscribeUserQueue("messages", (frame) => {
          const message = safeParse(frame.body);
          if (!message || toId(message.senderId) === currentUserId) return;

          const id = toId(message.id) || `message_${Date.now()}`;
          if (realtimeMessageIdsRef.current.has(id)) return;
          realtimeMessageIdsRef.current.add(id);
          if (realtimeMessageIdsRef.current.size > 300) {
            realtimeMessageIdsRef.current = new Set(Array.from(realtimeMessageIdsRef.current).slice(-150));
          }
          const description = message.content || "Bạn có tin nhắn mới.";
          emitRealtimeNotification({
            id,
            type: "message",
            title: "Tin nhắn mới",
            description,
            link: "/tin-nhan",
            payload: message,
          });
          toast("Tin nhắn mới", {
            description,
            duration: 3000,
            action: { label: "Mở", onClick: openMessages },
          });
        });

        subscribeUserQueue("call", (frame) => {
          const event = safeParse(frame.body);
          if (!event) return;
          const callId = toId(event.callId);
          const senderId = toId(event.senderId);
          if (!callId || senderId === currentUserId) return;

          const signalDataKey =
            typeof event.signalData === "string" ? event.signalData : JSON.stringify(event.signalData || "");
          const signalKey = `${callId}:${senderId}:${toId(event.type)}:${signalDataKey}`;
          if (processedCallSignalsRef.current.has(signalKey)) return;
          processedCallSignalsRef.current.add(signalKey);
          if (processedCallSignalsRef.current.size > 500) {
            processedCallSignalsRef.current = new Set(Array.from(processedCallSignalsRef.current).slice(-250));
          }

          if (event.type === "start") {
            const next = mergePendingCall(event);
            const fallbackName = senderId ? `Người dùng ${senderId}` : "Người gọi";

            api.getUser(senderId, token).then((caller: any) => {
              if (!caller || pendingCallRef.current?.callId !== callId) return;
              pendingCallRef.current = {
                ...pendingCallRef.current,
                senderName: caller.name || fallbackName,
                senderAvatar: caller.avatar,
              };
              savePendingCall(pendingCallRef.current);
              emitIncomingCall(pendingCallRef.current);
            }).catch(() => {});

            if (!notifiedCallIdsRef.current.has(callId)) {
              notifiedCallIdsRef.current.add(callId);
              const isVideo = event.callType !== "audio";
              const title = isVideo ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến";
              emitRealtimeNotification({
                id: callId,
                type: "call",
                title,
                description: fallbackName,
                link: "/tin-nhan",
                payload: next || event,
              });
              toast(title, {
                description: `${fallbackName} đang gọi cho bạn`,
                duration: 15000,
                action: { label: "Mở tin nhắn", onClick: openMessages },
              });
            }
            return;
          }

          if (event.type === "offer" || event.type === "ice-candidate" || event.type === "ice") {
            mergePendingCall(event);
            return;
          }

          if (event.type === "reject" || event.type === "end") {
            if (pendingCallRef.current?.callId === callId) pendingCallRef.current = null;
            clearPendingCall();
            toast.info(event.type === "reject" ? "Cuộc gọi đã bị từ chối" : "Cuộc gọi đã kết thúc", {
              duration: 3000,
            });
          }
        });

        subscribeUserQueue("errors", (frame) => {
          const message = safeParse(frame.body) || frame.body;
          if (message) console.warn("[Realtime]", message);
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      if (client.active) client.deactivate();
    };
  }, [navigate, user?.id]);

  return null;
}
