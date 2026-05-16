import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  Archive,
  BellRing,
  Camera,
  CameraOff,
  Check,
  ChevronLeft,
  Clock3,
  Image as ImageIcon,
  Inbox,
  Info,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Phone,
  PhoneOff,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Sparkles,
  Star,
  ThumbsUp,
  User as UserIcon,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import api from "../lib/api";
import { localStorage_service } from "../lib/localStorage";

// ==================== INTERFACES ====================
interface MessagesPageProps {
  readonly currentUser?: any;
}

interface ConversationItem {
  id: string;
  targetUserId?: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  status?: "accepted" | "pending" | string;
  isOnline?: boolean;
}

interface SearchUserItem {
  id: string;
  name: string;
  avatar?: string;
}

interface MessageItem {
  id: string;
  senderId: string;
  text: string;
  time: string;
  reactions?: Record<string, number>;
  userReactions?: Record<string, boolean>;
}

type CallMode = "audio" | "video";
type CallStatus = "incoming" | "connecting" | "active";

interface CallSession {
  id: string;
  mode: CallMode;
  status: CallStatus;
  startedAt: number | null;
  elapsedSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  hasMediaPermission: boolean;
  error: string | null;
}

// ✅ CONSTANTS
const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🎉', '👎', '😡', '⭐', '🔥'];

const starterPrompts = [
  "Chao ban, minh muon trao doi them ve bai viet cua ban.",
  "Ban co the gui them thong tin hoac tai lieu duoc khong?",
  "Minh co mot y tuong hop tac, neu ban ranh minh xin trao doi nhanh.",
];

const quickReplies = [
  "Cam on ban",
  "Minh dang xem",
  "Cho minh 5 phut nhe",
  "Ban gui them chi tiet duoc khong?",
];

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function MessagesPage({ currentUser }: MessagesPageProps) {
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const callSessionRef = useRef<CallSession | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { callSessionRef.current = callSession; }, [callSession]);
  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  const dedupConversations = (list: ConversationItem[]) => {
    const map = new Map<string, ConversationItem>();
    list.forEach((conversation) => {
      const key = conversation.targetUserId !== undefined && conversation.targetUserId !== null
        ? String(conversation.targetUserId) : String(conversation.id);
      if (!map.has(key)) map.set(key, conversation);
    });
    return Array.from(map.values());
  };

  const getAvatarUrl = (url?: string, id?: string) => {
    if (url && typeof url === "string" && url.trim()) return url;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id || "default"}`;
  };

  const toId = (value: unknown) => (value === undefined || value === null ? "" : String(value));
  const currentUserId = toId(currentUser?.id);

  const getConversationPeerId = (conversation?: Pick<ConversationItem, "id" | "targetUserId"> | null) => {
    if (!conversation) return "";
    const targetUserId = toId(conversation.targetUserId);
    if (targetUserId) return targetUserId;
    const conversationId = toId(conversation.id);
    return conversationId.startsWith("new_") ? conversationId.slice(4) : conversationId;
  };

  const getEventPeerId = (senderId?: unknown, receiverId?: unknown) => {
    const normalizedSenderId = toId(senderId);
    const normalizedReceiverId = toId(receiverId);
    if (normalizedSenderId && normalizedSenderId === currentUserId) return normalizedReceiverId;
    if (normalizedReceiverId && normalizedReceiverId === currentUserId) return normalizedSenderId;
    return normalizedSenderId || normalizedReceiverId;
  };

  const doesEventMatchSelectedChat = (conversationId?: unknown, senderId?: unknown, receiverId?: unknown) => {
    const selectedId = toId(selectedChatIdRef.current);
    if (!selectedId) return false;
    const normalizedConversationId = toId(conversationId);
    if (normalizedConversationId && normalizedConversationId === selectedId) return true;
    const selectedConversation = conversationsRef.current.find((c) => toId(c.id) === selectedId);
    const selectedPeerId = selectedConversation
      ? getConversationPeerId(selectedConversation)
      : selectedId.startsWith("new_") ? selectedId.slice(4) : "";
    const eventPeerId = getEventPeerId(senderId, receiverId);
    return Boolean(selectedPeerId && eventPeerId && selectedPeerId === eventPeerId);
  };

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    return [
      ...conversations,
      ...searchResults.map((user) => ({
        id: `new_${toId(user.id)}`,
        targetUserId: toId(user.id),
        name: user.name,
        avatar: user.avatar,
        status: "accepted",
        isOnline: true,
      })),
    ].find((c) => c.id === selectedChatId);
  }, [conversations, searchResults, selectedChatId]);

  const selectedChatAvatar = selectedChat
    ? getAvatarUrl(selectedChat.avatar, getConversationPeerId(selectedChat) || selectedChat.id)
    : "";

  // ==================== DATA LOADING ====================
  const loadChatsAndFriends = async () => {
    setIsLoadingChats(true);
    try {
      let convs: ConversationItem[] = [];
      try {
        const res = await api.request("GET", "/api/chat/conversations");
        const rawConvs = res?.data || (Array.isArray(res) ? res : []);
        convs = rawConvs.map((c: any) => ({
          id: toId(c.id),
          targetUserId: toId(c.targetUserId) || undefined,
          name: c.targetUserName || "Nguoi dung",
          avatar: c.targetUserAvatar,
          lastMessage: c.lastMessage || "Bat dau cuoc tro chuyen moi.",
          time: c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          unread: c.unreadCount || 0,
          status: c.status || "accepted",
          isOnline: true,
        }));
      } catch (error) { console.error("Loi tai lich su chat:", error); }

      let friends: any[] = [];
      try { friends = (await api.getMutualFollowersForChat()) || []; } catch (error) { console.error("Loi tai danh sach ban be:", error); }

      const finalConversations = [...convs];
      const existingTargetIds = new Set(convs.map((c) => String(c.targetUserId || c.id)));

      friends.forEach((friend: any) => {
        const friendId = toId(friend.id);
        if (!existingTargetIds.has(friendId)) {
          finalConversations.push({
            id: `new_${friendId}`,
            targetUserId: friendId,
            name: friend.name || "Nguoi dung",
            avatar: friend.avatar,
            lastMessage: "San sang mo cuoc tro chuyen.",
            time: "",
            unread: 0,
            isOnline: true,
            status: "accepted",
          });
        }
      });
      setConversations(dedupConversations(finalConversations));
    } finally { setIsLoadingChats(false); }
  };

  // ==================== CALL SIGNALING ====================
  const sendCallSignal = (type: string, signalData: any = null, targetId: string, callId: string, callMode: CallMode) => {
    if (stompClientRef.current?.connected) {
      let convId = selectedChatIdRef.current?.startsWith("new_") ? "" : selectedChatIdRef.current || "";
      if (!convId && (type === "end" || type === "reject")) {
        const foundChat = conversationsRef.current.find((c) => getConversationPeerId(c) === targetId);
        if (foundChat && !foundChat.id.startsWith("new_")) convId = foundChat.id;
      }
      stompClientRef.current.publish({
        destination: "/app/chat.call",
        body: JSON.stringify({ callId, conversationId: convId, receiverId: targetId, type, callType: callMode, signalData }),
      });
    }
  };

  const logCallStatusToChat = (session: CallSession, reason: "ended" | "missed" | "rejected") => {
    if (!stompClientRef.current?.connected) return;
    let logText = "";
    if (reason === "rejected") logText = session.mode === "video" ? "📹 Đã từ chối cuộc gọi video" : "📞 Đã từ chối cuộc gọi thoại";
    else if (reason === "missed" || session.elapsedSeconds === 0) logText = session.mode === "video" ? "📹 Cuộc gọi video nhỡ" : "📞 Cuộc gọi thoại nhỡ";
    else logText = `📞 Cuộc gọi kết thúc. Thời lượng: ${formatCallDuration(session.elapsedSeconds)}`;

    let convId = selectedChatIdRef.current?.startsWith("new_") ? "" : selectedChatIdRef.current;
    if (!convId) {
      const foundChat = conversationsRef.current.find((c) => getConversationPeerId(c) === session.peerId);
      if (foundChat && !foundChat.id.startsWith("new_")) convId = foundChat.id;
    }
    stompClientRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify({ conversationId: convId || "", receiverId: session.peerId, content: logText, messageType: "text" }),
    });
  };

  const createPeerConnection = (targetId: string, callId: string, callMode: CallMode) => {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = (event) => {
      if (event.candidate) sendCallSignal("ice-candidate", { candidate: event.candidate.candidate, sdpMid: event.candidate.sdpMid, sdpMLineIndex: event.candidate.sdpMLineIndex }, targetId, callId, callMode);
    };
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        const stream = event.streams[0];
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      }
    };
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    peerConnectionRef.current = pc;
    return pc;
  };

  const closeCall = (isLocal = true, isReject = false) => {
    const currentSession = callSessionRef.current;
    if (currentSession && isLocal) {
      if (isReject) { logCallStatusToChat(currentSession, "rejected"); sendCallSignal("reject", null, currentSession.peerId, currentSession.id, currentSession.mode); }
      else {
        if (currentSession.status === "incoming") { logCallStatusToChat(currentSession, "rejected"); sendCallSignal("reject", null, currentSession.peerId, currentSession.id, currentSession.mode); }
        else { logCallStatusToChat(currentSession, currentSession.elapsedSeconds === 0 ? "missed" : "ended"); sendCallSignal("end", null, currentSession.peerId, currentSession.id, currentSession.mode); }
      }
    }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    remoteStreamRef.current = null; incomingOfferRef.current = null; iceCandidateQueueRef.current = [];
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((track) => track.stop()); localStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallSession(null);
  };

  const startCall = async (mode: CallMode) => {
    if (!selectedChat) { toast.error("Hay chon mot cuoc tro chuyen truoc."); return; }
    if (selectedChat.status === "pending") { toast.error("Khong the goi khi hoi thoai van dang cho phe duyet."); return; }
    closeCall(false);
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetId = getConversationPeerId(selectedChat);
    const newSession: CallSession = { id: callId, mode, status: "connecting", startedAt: null, elapsedSeconds: 0, isMuted: false, isCameraOff: mode === "audio", isSpeakerOn: true, peerId: targetId, peerName: selectedChat.name, peerAvatar: selectedChatAvatar, hasMediaPermission: true, error: null };
    callSessionRef.current = newSession; setCallSession(newSession);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trinh duyet hien tai khong ho tro media devices.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(targetId, callId, mode);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      sendCallSignal("start", null, targetId, callId, mode);
      sendCallSignal("offer", { type: offer.type, sdp: offer.sdp }, targetId, callId, mode);
    } catch (error: any) { toast.error("Khong the truy cap camera va micro."); setCallSession((prev) => (prev ? { ...prev, hasMediaPermission: false, error: error.message } : prev)); closeCall(true); }
  };

  const acceptCall = async () => {
    const currentSession = callSessionRef.current; if (!currentSession) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: currentSession.mode === "video" });
      localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(currentSession.peerId, currentSession.id, currentSession.mode);
      const nextSession = { ...currentSession, status: "active" as CallStatus, startedAt: Date.now() };
      callSessionRef.current = nextSession; setCallSession(nextSession);
      sendCallSignal("accept", null, currentSession.peerId, currentSession.id, currentSession.mode);
      if (incomingOfferRef.current) {
        const offerDesc = new RTCSessionDescription(incomingOfferRef.current); incomingOfferRef.current = null;
        await pc.setRemoteDescription(offerDesc);
        iceCandidateQueueRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error)); iceCandidateQueueRef.current = [];
        const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        sendCallSignal("answer", { type: answer.type, sdp: answer.sdp }, currentSession.peerId, currentSession.id, currentSession.mode);
      } else console.log("⏳ Đang chờ SDP Offer từ người gọi...");
    } catch (err: any) { toast.error(`Loi thiet bi khi chap nhan cuoc goi: ${err.message}`); rejectCall(); }
  };

  const rejectCall = () => closeCall(true, true);
  const toggleMute = () => setCallSession((prev) => { if (!prev) return prev; const nextMuted = !prev.isMuted; localStreamRef.current?.getAudioTracks().forEach((track) => track.enabled = !nextMuted); return { ...prev, isMuted: nextMuted }; });
  const toggleCamera = () => setCallSession((prev) => { if (!prev || prev.mode !== "video") return prev; const nextCameraOff = !prev.isCameraOff; localStreamRef.current?.getVideoTracks().forEach((track) => track.enabled = !nextCameraOff); return { ...prev, isCameraOff: nextCameraOff }; });
  const toggleSpeaker = () => setCallSession((prev) => (prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : prev));

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!stompClientRef.current?.connected) {
      toast.error("Kết nối WebSocket chưa sẵn sàng.");
      return;
    }
    setShowReactionPicker(null);
    stompClientRef.current.publish({
      destination: "/app/chat.react",
      body: JSON.stringify({ messageId, emoji })
    });
  };

  // ==================== ✅ WEBSOCKET CONNECTION (ĐÃ SỬA LỖI) ====================
  useEffect(() => {
    if (!currentUserId) return;
    const token = localStorage_service.getAuthToken();
    if (!token) return;
    if (stompClientRef.current?.active) {
      stompClientRef.current.deactivate();
    }

    const client = new Client({
      // ✅ SỬA 1: Bỏ ?token= khỏi URL để tránh lỗi Tomcat "Invalid character found in method name"
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'https://donjaderoy-knowledge-iy-5ba.fly.dev/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => console.log("[STOMP Debug]", str),
      onStompError: (frame) => console.error("[STOMP Error]", frame.headers.message, frame.body),
      onWebSocketError: (event) => console.error("[WebSocket Error]", event),
      onConnect: () => {
        console.log("[STOMP]  Kết nối thành công!");
        
        const safeJSONParse = (data: any) => {
          if (!data) return null;
          if (typeof data === "object") return data;
          const str = String(data).trim();
          if (str === "" || str === "undefined" || str === "null") return null;
          try { return JSON.parse(str); } catch { return null; }
        };

        client.subscribe(`/user/${currentUserId}/queue/messages`, (frame) => {
          const newMessage = safeJSONParse(frame.body); if (!newMessage) return;
          const conversationId = toId(newMessage.conversationId); const senderId = toId(newMessage.senderId); const receiverId = toId(newMessage.receiverId); const peerId = getEventPeerId(senderId, receiverId);
          setConversations((prevConvs) => {
            const updated = [...prevConvs];
            const idx = updated.findIndex((c) => (conversationId && toId(c.id) === conversationId) || (peerId && getConversationPeerId(c) === peerId));
            if (idx > -1) {
              const conv = { ...updated[idx] };
              conv.lastMessage = newMessage.content;
              conv.time = new Date(newMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              if (senderId !== currentUserId && !doesEventMatchSelectedChat(conversationId, senderId, receiverId)) conv.unread = (conv.unread || 0) + 1;
              if (toId(conv.id).startsWith("new_") && conversationId) {
                const prevPeerId = getConversationPeerId(conv);
                conv.id = conversationId; conv.targetUserId = conv.targetUserId || prevPeerId || peerId;
                if (selectedChatIdRef.current === `new_${prevPeerId}` || selectedChatIdRef.current === `new_${peerId}`) setSelectedChatId(conversationId);
              }
              updated.splice(idx, 1); updated.unshift(conv); return dedupConversations(updated);
            }
            loadChatsAndFriends(); return updated;
          });
          if (doesEventMatchSelectedChat(conversationId, senderId, receiverId)) {
            setMessages((prevMsgs) => {
              if (prevMsgs.some((m) => m.id === newMessage.id)) return prevMsgs;
              const clean = prevMsgs.filter((m) => !(m.id.startsWith("temp_") && m.text === newMessage.content));
              return [...clean, { id: newMessage.id, senderId: senderId === currentUserId ? "me" : senderId, text: newMessage.content, time: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }];
            });
          }
        });

        client.subscribe(`/user/${currentUserId}/queue/typing`, (frame) => {
          const event = safeJSONParse(frame.body); if (!event) return;
          const isTyping = event.isTyping === true || event.typing === true;
          const convKey = toId(event.conversationId); const peerId = getEventPeerId(event.senderId, event.receiverId);
          setTypingUsers((prev) => { const next = { ...prev }; if (convKey) next[convKey] = isTyping; if (peerId) next[`new_${peerId}`] = isTyping; return next; });
        });

        client.subscribe(`/user/${currentUserId}/queue/call`, (frame) => {
          const event = safeJSONParse(frame.body); if (!event) return;
          const { type, callId, callType, senderId, signalData } = event; const parsedData = safeJSONParse(signalData);
          if (type === "start") {
            const caller = conversationsRef.current.find((c) => getConversationPeerId(c) === toId(senderId));
            const incomingSession: CallSession = { id: callId, mode: callType, status: "incoming", startedAt: null, elapsedSeconds: 0, isMuted: false, isCameraOff: callType === "audio", isSpeakerOn: true, peerId: toId(senderId), peerName: caller?.name || "Nguoi goi", peerAvatar: caller?.avatar || getAvatarUrl("", senderId), hasMediaPermission: true, error: null };
            callSessionRef.current = incomingSession; setCallSession(incomingSession);
          } else if (type === "offer" && parsedData) {
            incomingOfferRef.current = parsedData;
            const pc = peerConnectionRef.current;
            if (pc && !pc.remoteDescription) {
              const offerDesc = new RTCSessionDescription(parsedData); incomingOfferRef.current = null;
              pc.setRemoteDescription(offerDesc).then(() => {
                iceCandidateQueueRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error)); iceCandidateQueueRef.current = []; return pc.createAnswer();
              }).then((answer) => pc.setLocalDescription(answer)).then(() => { if (pc.localDescription) sendCallSignal("answer", { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, toId(senderId), callId, callType); }).catch((err) => console.error("❌ Lỗi xử lý Offer:", err));
            }
          } else if (type === "answer" && parsedData && peerConnectionRef.current) {
            const answerDesc = new RTCSessionDescription(parsedData);
            peerConnectionRef.current.setRemoteDescription(answerDesc).then(() => { iceCandidateQueueRef.current.forEach((c) => peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(console.error)); iceCandidateQueueRef.current = []; }).catch(console.error);
            const nextSession = callSessionRef.current ? { ...callSessionRef.current, status: "active" as CallStatus, startedAt: Date.now() } : null;
            if (nextSession) { callSessionRef.current = nextSession; setCallSession(nextSession); }
          } else if ((type === "ice-candidate" || type === "ice") && parsedData) {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(parsedData)).catch(console.error);
            else iceCandidateQueueRef.current.push(parsedData);
          } else if (type === "reject" || type === "end") {
            if (callSessionRef.current) toast.info(type === "reject" ? "Đã từ chối cuộc gọi" : "Cuộc gọi đã kết thúc");
            closeCall(false);
          }
        });

        client.subscribe(`/user/${currentUserId}/queue/reactions`, (frame) => {
          const reaction = safeJSONParse(frame.body);
          if (!reaction) return;
          setMessages(prev => prev.map(msg => {
            if (msg.id !== reaction.messageId) return msg;
            const updatedUserReactions = { ...(msg.userReactions || {}) };
            if (reaction.action === 'added') updatedUserReactions[reaction.emoji] = true;
            else delete updatedUserReactions[reaction.emoji];
            return { ...msg, reactions: reaction.reactions, userReactions: updatedUserReactions };
          }));
        });
      },
      onDisconnect: () => console.log("[STOMP] 🔌 Mất kết nối"),
    });

    client.activate();
    stompClientRef.current = client;

    // ✅ SỬA 3: Cleanup chuẩn React, bỏ setTimeout gây leak & duplicate connections
    return () => {
      if (client.active) client.deactivate();
    };
  }, [currentUserId]);

  useEffect(() => { loadChatsAndFriends(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current && remoteStreamRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    if (remoteAudioRef.current && remoteStreamRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
  }, [callSession?.mode, callSession?.status]);
  useEffect(() => {
    if (!callSession || callSession.status !== "active" || !callSession.startedAt) return;
    const timer = setInterval(() => {
      setCallSession((prev) => prev && prev.startedAt ? { ...prev, elapsedSeconds: Math.floor((Date.now() - prev.startedAt) / 1000) } : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [callSession?.status, callSession?.startedAt]);
  useEffect(() => { return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); closeCall(false); }; }, []);

  const isSearchMode = searchQuery.trim().length > 0;
  useEffect(() => {
    if (isSearchMode || !selectedChatId) return;
    const currentChat = conversations.find((c) => c.id === selectedChatId);
    if (!currentChat) return;
    const expectedStatus = activeTab === "inbox" ? "accepted" : "pending";
    if (currentChat.status !== expectedStatus) setSelectedChatId(null);
  }, [activeTab, conversations, selectedChatId, isSearchMode]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try { const results = await api.searchUsersToChat(searchQuery); setSearchResults(results || []); } catch (error) { console.error("Loi tim kiem:", error); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedChatId) return;
    if (selectedChatId.startsWith("new_")) { setMessages([]); return; }
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await api.request("GET", `/api/chat/messages/${selectedChatId}`);
        const dataList = Array.isArray(res) ? res : res?.data || [];
        const formatted = dataList.map((m: any) => ({
          id: toId(m.id) || Math.random().toString(),
          senderId: toId(m.senderId) === currentUserId ? "me" : toId(m.senderId),
          text: m.content || m.text || "Tin nhan hien thi khong hop le.",
          time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: m.reactions || {},
          userReactions: m.userReactions || {}
        }));
        setMessages(formatted);
        setConversations((prev) => prev.map((c) => (c.id === selectedChatId ? { ...c, unread: 0 } : c)));
      } catch { setMessages([]); }
      finally { setIsLoadingMessages(false); }
    };
    fetchMessages();
  }, [selectedChatId, currentUserId]);

  // ==================== ✅ HANDLE SEND MESSAGE (ĐÃ THÊM FALLBACK) ====================
  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;
    const content = messageInput.trim();
    setMessageInput("");

    const optimistic: MessageItem = { id: `temp_${Date.now()}`, senderId: "me", text: content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((c) => c.id === selectedChat.id);
      if (idx > -1) { const conv = { ...updated[idx], lastMessage: `Ban: ${content}`, time: optimistic.time }; updated.splice(idx, 1); updated.unshift(conv); }
      else if (selectedChatId?.startsWith("new_")) { updated.unshift({ ...selectedChat, lastMessage: `Ban: ${content}`, time: optimistic.time, unread: 0 }); }
      return dedupConversations(updated);
    });

    const payload = {
      conversationId: selectedChat.id.startsWith("new_") ? "" : selectedChat.id,
      receiverId: getConversationPeerId(selectedChat),
      content,
      messageType: "text",
    };

    // ✅ SỬA 4: Ưu tiên WebSocket, nếu rớt thì fallback qua REST API để KHÔNG BAO GIỜ MẤT TIN
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({ destination: "/app/chat.sendMessage", body: JSON.stringify(payload) });
    } else {
      try {
        await api.request("POST", "/api/chat/messages", payload);
        toast.success("Đã gửi tin nhắn (WebSocket đang khôi phục)");
      } catch (err) {
        console.error("Lỗi gửi tin nhắn fallback:", err);
        toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    }

    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify({ conversationId: payload.conversationId, receiverId: payload.receiverId, isTyping: false, typing: false }) });
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessageInput(event.target.value);
    if (stompClientRef.current?.connected && selectedChat) {
      const payload = { conversationId: selectedChat.id.startsWith("new_") ? "" : selectedChat.id, receiverId: getConversationPeerId(selectedChat), isTyping: true, typing: true };
      stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify(payload) });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (stompClientRef.current?.connected) stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify({ ...payload, isTyping: false, typing: false }) });
      }, 2000);
    }
  };

  const handleQuickReply = (text: string) => setMessageInput(text);

  const inboxConversations = conversations.filter((c) => c.status === "accepted");
  const pendingConversations = conversations.filter((c) => c.status === "pending");
  const totalUnread = inboxConversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const onlineCount = inboxConversations.filter((c) => c.isOnline).length;

  const displayList: ConversationItem[] = isSearchMode
    ? searchResults.map((u) => ({ id: `new_${toId(u.id)}`, targetUserId: toId(u.id), name: u.name, avatar: u.avatar, lastMessage: "Nhan de mo cuoc tro chuyen ngay.", time: "", unread: 0, isOnline: true, status: "accepted" }))
    : conversations.filter((c) => (activeTab === "inbox" ? c.status === "accepted" : c.status === "pending"));

  const selectedPeerId = selectedChat ? getConversationPeerId(selectedChat) : "";
  const isSelectedTyping = selectedChat ? Boolean(typingUsers[selectedChat.id] || (selectedPeerId && typingUsers[`new_${selectedPeerId}`])) : false;
  const selectedResponseState = isSelectedTyping ? "Dang soan tin nhan" : selectedChat?.isOnline ? "Dang hoat dong" : "Hoat dong gan day";

  const selectedHighlights = selectedChat
    ? [{ icon: BellRing, title: "Do uu tien", value: selectedChat.unread ? "Can xu ly" : "On dinh" }, { icon: Clock3, title: "Lan trao doi", value: selectedChat.time || "Moi bat dau" }, { icon: Star, title: "Trang thai", value: selectedChat.status === "pending" ? "Cho phe duyet" : "San sang ket noi" }]
    : [];

  const insightCards = [{ label: "Tin moi", value: totalUnread, accent: "from-orange-500 to-amber-500" }, { label: "Dang online", value: onlineCount, accent: "from-orange-400 to-orange-500" }, { label: "Tin cho", value: pendingConversations.length, accent: "from-amber-500 to-orange-500" }];

  return (
    <div className="messenger-page h-full min-h-0 bg-white px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1380px]">
        <div className="flex h-full min-h-0 w-full overflow-hidden sm:rounded-[32px] sm:border border-orange-100 bg-white shadow-[0_20px_56px_rgba(249,115,22,0.06)]">
          <aside className={`${selectedChat ? "hidden lg:flex" : "flex"} messenger-sidebar w-full shrink-0 flex-col border-r border-orange-100 bg-white lg:w-[320px] xl:w-[360px]`}>
            <div className="border-b border-orange-100 px-5 pb-4 pt-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                    <Sparkles className="h-3.5 w-3.5" /> Message Studio
                  </div>
                  <h1 className="text-2xl font-semibold text-slate-950">Tin nhan</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Hop thu trung tam cho trao doi, goi nhanh va quan ly hoi thoai.</p>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-orange-100 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600"><MoreHorizontal className="h-5 w-5" /></Button>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3">
                {insightCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-orange-100 bg-white p-3 shadow-sm">
                    <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${card.accent}`} />
                    <div className="text-xl font-semibold text-slate-950">{card.value}</div>
                    <div className="text-xs font-medium text-slate-500">{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Tim nguoi dung, ten doi thoai..." className="h-12 rounded-2xl border-orange-100 bg-white pl-11 shadow-sm focus-visible:ring-orange-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {!isSearchMode ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 w-full">
                  <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <TabsTrigger value="inbox" className="rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">Hop thu</TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-xl text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">Tin cho</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">Dang tim kiem "{searchQuery.trim()}"</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoadingChats || isSearching ? (
                <div className="flex h-full min-h-[320px] items-center justify-center">
                  <div className="inline-flex items-center gap-3 rounded-full border border-orange-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Dang dong bo hoi thoai...
                  </div>
                </div>
              ) : displayList.length > 0 ? (
                <div className="space-y-2">
                  {displayList.map((chat) => {
                    const isActive = selectedChat?.id === chat.id;
                    const avatarUrl = getAvatarUrl(chat.avatar, chat.targetUserId || chat.id);
                    return (
                      <button key={chat.id} type="button" onClick={() => { setSelectedChatId(chat.id); setShowInfo(false); }} className={`w-full rounded-[26px] border p-3 text-left transition-all ${isActive ? "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] shadow-[0_14px_38px_rgba(249,115,22,0.12)]" : "border-transparent bg-white hover:border-orange-100 hover:bg-orange-50/40"}`}>
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <img src={avatarUrl} alt={chat.name} className="h-14 w-14 rounded-[20px] border border-orange-100 object-cover shadow-sm" />
                            {chat.isOnline && chat.status !== "pending" && <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-950">{chat.name}</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${chat.status === "pending" ? "bg-orange-100 text-orange-700" : chat.unread ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                                    {chat.status === "pending" ? "Cho phe duyet" : chat.unread ? "Tin moi" : "On dinh"}
                                  </span>
                                  {chat.time && <span className="text-[11px] text-slate-400">{chat.time}</span>}
                                </div>
                              </div>
                              {chat.unread && <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-950 px-2 text-[11px] font-semibold text-white">{chat.unread}</span>}
                            </div>
                            <p className="messenger-preview mt-3 text-sm leading-6 text-slate-500">{typingUsers[chat.id] ? "Dang nhap noi dung..." : chat.lastMessage || "Nhan de mo cuoc tro chuyen ngay."}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-[28px] border border-dashed border-orange-100 bg-orange-50/50 px-8 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm"><Inbox className="h-8 w-8 text-orange-500" /></div>
                  <div className="text-lg font-semibold text-slate-950">{isSearchMode ? "Khong tim thay ket qua phu hop" : "Chua co hoi thoai nao"}</div>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{isSearchMode ? "Thu mo rong tu khoa, ten day du hoac bat dau hoi thoai tu danh sach ban be." : "Khi ban mo cuoc tro chuyen moi, tat ca tin nhan se duoc tap trung tai day."}</p>
                </div>
              )}
            </div>
          </aside>

          <section className={`${selectedChat ? "flex" : "hidden lg:flex"} messenger-thread min-w-0 flex-1 flex-col bg-white`}>
            {selectedChat ? (
              <>
                <div className="border-b border-orange-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 lg:hidden" onClick={() => setSelectedChatId(null)}><ChevronLeft className="h-5 w-5" /></Button>
                      <div className="relative shrink-0">
                        <img src={selectedChatAvatar} alt={selectedChat.name} className="h-12 w-12 rounded-[20px] border border-orange-100 object-cover shadow-sm" />
                        {selectedChat.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-semibold text-slate-950">{selectedChat.name}</h2>
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">{selectedChat.status === "pending" ? "Tin cho phe duyet" : "Hoi thoai dang mo"}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{selectedResponseState}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600" onClick={() => startCall("audio")}><Phone className="h-4.5 w-4.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600" onClick={() => startCall("video")}><Video className="h-4.5 w-4.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 rounded-full border border-orange-100 bg-white transition-colors ${showInfo ? "text-orange-600 ring-2 ring-orange-200" : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"}`} onClick={() => setShowInfo((p) => !p)}><Info className="h-4.5 w-4.5" /></Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedHighlights.map((item) => (
                      <div key={item.title} className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs font-medium text-slate-600">
                        <item.icon className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-slate-400">{item.title}</span>
                        <span className="text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                      {isLoadingMessages ? (
                        <div className="flex h-full min-h-[320px] items-center justify-center">
                          <div className="inline-flex items-center gap-3 rounded-full border border-orange-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Dang tai lich su tin nhan...
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="mx-auto flex h-full min-h-[420px] max-w-2xl flex-col items-center justify-center text-center">
                          <div className="relative mb-6">
                            <div className="absolute inset-0 scale-125 rounded-full bg-orange-200/35 blur-2xl" />
                            <img src={selectedChatAvatar} alt={selectedChat.name} className="relative h-24 w-24 rounded-[28px] border-4 border-white object-cover shadow-xl" />
                          </div>
                          <div className="rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Khoi dong cuoc tro chuyen</div>
                          <h3 className="mt-5 text-2xl font-semibold text-slate-950">{selectedChat.name}</h3>
                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">Day la khung chat da san sang cho goi video, goi thoai va trao doi tai lieu. Ban co the bat dau bang mot thong diep ngan, ro rang.</p>
                          <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
                            {starterPrompts.map((prompt) => (
                              <button key={prompt} type="button" onClick={() => handleQuickReply(prompt)} className="messenger-floating-card rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><MessageCircle className="h-4 w-4" /></div>
                                <p className="text-sm leading-6 text-slate-700">{prompt}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-[820px] space-y-1.5">
                          <div className="flex justify-center">
                            <div className="rounded-full border border-orange-100 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">Dong trao doi hom nay</div>
                          </div>
                          {messages.map((message, index) => {
                            const isMe = message.senderId === "me";
                            const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId);
                            return (
                              <div key={message.id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                                {!isMe && (
                                  <div className="mr-2 flex w-10 shrink-0 items-end">
                                    {showAvatar ? <img src={selectedChatAvatar} alt="" className="h-9 w-9 rounded-2xl border border-orange-100 object-cover shadow-sm" /> : <div className="h-9 w-9" />}
                                  </div>
                                )}
                                <div className="relative">
                                  <div className={`flex max-w-[84%] items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} sm:max-w-[72%]`}>
                                    <span className="shrink-0 pb-1 text-[11px] font-medium text-slate-400">{message.time}</span>
                                    <div className={`rounded-[22px] px-4 py-1.5 text-[14px] leading-6 ${isMe ? "messenger-bubble-outgoing rounded-br-lg text-white" : "messenger-bubble-incoming rounded-bl-lg text-slate-800"}`}>
                                      {message.text}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                                    className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-md border p-1 text-lg hover:scale-110"
                                  >
                                    😊
                                  </button>

                                  {showReactionPicker === message.id && (
                                    <div className="absolute bottom-full mb-2 flex gap-1 bg-white rounded-full shadow-lg border p-1 z-10" onClick={(e) => e.stopPropagation()}>
                                      {REACTION_EMOJIS.map(emoji => (
                                        <button key={emoji} type="button" onClick={() => handleToggleReaction(message.id, emoji)} className="text-lg hover:scale-125 transition-transform p-1">
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {message.reactions && Object.entries(message.reactions).filter(([, count]) => count > 0).length > 0 && (
                                    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                      {Object.entries(message.reactions).map(([emoji, count]) => count > 0 && (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleToggleReaction(message.id, emoji)}
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${
                                            message.userReactions?.[emoji]
                                              ? "bg-orange-100 border-orange-300 text-orange-700"
                                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                                          }`}
                                        >
                                          <span>{emoji}</span>
                                          <span className="font-medium">{count}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {isSelectedTyping && (
                            <div className="flex justify-start">
                              <div className="mr-2 flex w-10 shrink-0 items-end">
                                <img src={selectedChatAvatar} alt="" className="h-9 w-9 rounded-2xl border border-orange-100 object-cover shadow-sm" />
                              </div>
                              <div className="flex items-center gap-1 rounded-[24px] rounded-bl-lg border border-white bg-white px-4 py-3 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0s" }} />
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.12s" }} />
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.24s" }} />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} className="h-1" />
                        </div>
                      )}
                    </div>

                    {selectedChat.status === "pending" ? (
                      <div className="border-t border-orange-100 bg-white/90 px-4 py-5 sm:px-6">
                        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[28px] border border-orange-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))] p-6 text-center shadow-sm">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500"><ShieldAlert className="h-7 w-7" /></div>
                          <h3 className="text-lg font-semibold text-slate-900">Chap nhan tin nhan cho?</h3>
                          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">Khi chap nhan, hoi thoai se duoc dua vao hop thu chinh va mo khoa goi audio, video.</p>
                          <div className="mt-5 flex w-full max-w-sm gap-3">
                            <Button variant="outline" className="h-11 flex-1 rounded-2xl border-orange-100 bg-white hover:bg-orange-50">Tu choi</Button>
                            <Button className="h-11 flex-1 rounded-2xl bg-orange-500 text-white hover:bg-orange-600"><Check className="mr-2 h-4 w-4" /> Chap nhan</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-orange-100 bg-white/95 px-4 py-4 sm:px-6">
                        <div className="mx-auto max-w-[820px]">
                          <div className="mb-3 flex flex-wrap gap-2">
                            {quickReplies.map((reply) => (
                              <button key={reply} type="button" onClick={() => handleQuickReply(reply)} className="rounded-full border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:bg-orange-100 hover:text-orange-700">
                                {reply}
                              </button>
                            ))}
                          </div>
                          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-2xl border border-orange-100 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600"><ImageIcon className="h-5 w-5" /></Button>
                            <div className="messenger-blue-ring flex flex-1 items-end rounded-[28px] border border-orange-100 bg-white px-4 py-2 shadow-sm transition">
                              <input type="text" placeholder="Nhap tin nhan, chia se tai lieu, hoac bat dau cuoc goi..." value={messageInput} onChange={handleInputChange} className="min-h-[28px] flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                              <button type="button" className="mb-1 ml-3 rounded-full p-1 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"><Smile className="h-5 w-5" /></button>
                            </div>
                            {messageInput.trim() ? (
                              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600"><Send className="h-4 w-4" /></Button>
                            ) : (
                              <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-2xl border border-orange-100 bg-white text-orange-600 hover:bg-orange-50"><ThumbsUp className="h-5 w-5" /></Button>
                            )}
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {showInfo && (
                    <>
                      <button type="button" aria-label="Dong thong tin" className="absolute inset-0 z-10 bg-slate-950/10 2xl:hidden" onClick={() => setShowInfo(false)} />
                      <aside className="messenger-info-panel absolute inset-y-0 right-0 z-20 flex w-full max-w-[320px] flex-col border-l border-orange-100 bg-white shadow-2xl 2xl:static 2xl:shadow-none">
                        <div className="border-b border-orange-100 px-5 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-950">Thong tin hoi thoai</div>
                              <div className="text-xs text-slate-500">Profile nhanh va hanh dong lien quan</div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100" onClick={() => setShowInfo(false)}><X className="h-4.5 w-4.5" /></Button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                          <div className="rounded-[28px] border border-orange-100 bg-[linear-gradient(145deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98),rgba(255,237,213,0.76))] p-5 text-center shadow-sm">
                            <img src={selectedChatAvatar} alt={selectedChat.name} className="mx-auto h-20 w-20 rounded-[24px] border-4 border-white object-cover shadow-lg" />
                            <h3 className="mt-4 text-lg font-semibold text-slate-950">{selectedChat.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{selectedResponseState}</p>
                            <div className="mt-4 flex justify-center gap-2">
                              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orange-700">{selectedChat.status === "pending" ? "Cho phe duyet" : "Ket noi an toan"}</span>
                              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600">{messages.length} tin nhan</span>
                            </div>
                          </div>
                          <div className="mt-5 grid grid-cols-3 gap-3">
                            {selectedHighlights.map((item) => (
                              <div key={item.title} className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3 text-center">
                                <item.icon className="mx-auto h-4 w-4 text-orange-500" />
                                <div className="mt-2 text-xs font-medium text-slate-400">{item.title}</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6">
                            <div className="mb-3 text-sm font-semibold text-slate-900">Quick actions</div>
                            <div className="space-y-2">
                              <Button variant="ghost" className="h-12 w-full justify-start rounded-2xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50"><UserIcon className="mr-3 h-4 w-4 text-slate-400" /> Xem trang ca nhan</Button>
                              <Button variant="ghost" className="h-12 w-full justify-start rounded-2xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50" onClick={() => startCall("audio")}><Phone className="mr-3 h-4 w-4 text-slate-400" /> Bat dau goi thoai</Button>
                              <Button variant="ghost" className="h-12 w-full justify-start rounded-2xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50" onClick={() => startCall("video")}><Video className="mr-3 h-4 w-4 text-slate-400" /> Bat dau video call</Button>
                              <Button variant="ghost" className="h-12 w-full justify-start rounded-2xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50"><Archive className="mr-3 h-4 w-4 text-slate-400" /> Luu tru hoi thoai</Button>
                            </div>
                          </div>
                          <Separator className="my-6" />
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                              <div className="mb-2 text-sm font-semibold text-red-700">Bao mat va kiem soat</div>
                              <p className="text-sm leading-6 text-red-600">Neu phat hien spam hoac quang cao, ban co the chan nguoi dung nay de ngan tin nhan trong tuong lai.</p>
                              <Button variant="ghost" className="mt-3 h-11 w-full justify-start rounded-2xl bg-white text-red-600 hover:bg-red-100 hover:text-red-700"><X className="mr-3 h-4 w-4" /> Chan nguoi dung</Button>
                            </div>
                          </div>
                        </div>
                      </aside>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-10">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-xl shadow-orange-100"><MessageCircle className="h-10 w-10 text-orange-500" /></div>
                  <div className="mx-auto max-w-sm rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Messaging hub</div>
                  <h2 className="mt-6 text-3xl font-semibold text-slate-950">Tap trung tat ca trao doi vao mot noi</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">Chon mot hoi thoai ben trai de nhan tin, goi audio, video call va quan ly thong tin lien quan trong mot khung UI dong bo.</p>
                  <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
                    <div className="rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-sm">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><BellRing className="h-5 w-5" /></div>
                      <div className="text-lg font-semibold text-slate-950">{totalUnread}</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">Tin nhan can xu ly</div>
                    </div>
                    <div className="rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-sm">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-orange-600"><Phone className="h-5 w-5" /></div>
                      <div className="text-lg font-semibold text-slate-950">Audio / Video</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">WebRTC Ready</div>
                    </div>
                    <div className="rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-sm">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Clock3 className="h-5 w-5" /></div>
                      <div className="text-lg font-semibold text-slate-950">{pendingConversations.length}</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">Yeu cau dang cho</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {callSession && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-orange-200/10 bg-[linear-gradient(180deg,#2a1207_0%,#120d0a_100%)] shadow-[0_40px_120px_rgba(15,23,42,0.45)]">
            <div className="grid min-h-[640px] lg:grid-cols-[1.6fr_0.8fr]">
              <div className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.24),_transparent_20%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_20%)]" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-orange-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
                    {callSession.mode === "video" ? <Camera className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                    {callSession.mode === "video" ? "Video call" : "Audio call"}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/15" onClick={() => closeCall(true)}><X className="h-4.5 w-4.5" /></Button>
                </div>
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
                  {callSession.status === "incoming" ? (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 rounded-full bg-orange-400/30 blur-3xl animate-pulse" />
                        <img src={callSession.peerAvatar} alt="Avatar" className="relative h-32 w-32 rounded-[32px] border-4 border-white/15 object-cover shadow-2xl" />
                      </div>
                      <div className="text-3xl font-semibold text-white">{callSession.peerName}</div>
                      <div className="mt-3 text-slate-300">Dang goi {callSession.mode === "video" ? "Video" : "Thoai"}...</div>
                      <div className="mt-8 flex gap-6">
                        <Button size="icon" className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30" onClick={rejectCall}><PhoneOff className="h-6 w-6 text-white" /></Button>
                        <Button size="icon" className="h-16 w-16 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30" onClick={acceptCall}>{callSession.mode === "video" ? <Video className="h-6 w-6 text-white" /> : <Phone className="h-6 w-6 text-white" />}</Button>
                      </div>
                    </div>
                  ) : callSession.mode === "video" ? (
                    <div className="relative w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 shadow-2xl">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.72))]" />
                      <div className="flex h-[430px] items-center justify-center">
                        {callSession.hasMediaPermission && !callSession.isCameraOff ? (
                          <>
                            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                            <div className="absolute bottom-4 right-4 h-36 w-24 overflow-hidden rounded-2xl border-2 border-white/20 bg-slate-800 shadow-xl">
                              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-200">
                            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/10"><CameraOff className="h-10 w-10" /></div>
                            <div className="text-lg font-semibold">Camera dang tat hoac khong the truy cap</div>
                          </div>
                        )}
                        {callSession.status === "connecting" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 rounded-2xl bg-black/45 px-4 py-3 text-left text-white backdrop-blur z-20">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-300">Live WebRTC</div>
                        <div className="mt-1 text-sm font-semibold">{currentUser?.name || "Tai khoan hien tai"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 rounded-full bg-orange-400/30 blur-3xl" />
                        <img src={callSession.peerAvatar} alt={callSession.peerName} className="relative h-32 w-32 rounded-[32px] border-4 border-white/15 object-cover shadow-2xl" />
                      </div>
                      <div className="text-3xl font-semibold text-white">{callSession.peerName}</div>
                      <div className="mt-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-200">
                        {callSession.status === "connecting" ? "Dang ket noi..." : `Dang goi ${formatCallDuration(callSession.elapsedSeconds)}`}
                      </div>
                      <audio ref={remoteAudioRef} autoPlay playsInline />
                    </div>
                  )}
                </div>
                {callSession.status !== "incoming" && (
                  <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" variant="ghost" size="icon" className={`h-14 w-14 rounded-full border border-white/10 ${callSession.isMuted ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/15"}`} onClick={toggleMute}>{callSession.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
                    {callSession.mode === "video" && (
                      <Button type="button" variant="ghost" size="icon" className={`h-14 w-14 rounded-full border border-white/10 ${callSession.isCameraOff ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/15"}`} onClick={toggleCamera}>{callSession.isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" className={`h-14 w-14 rounded-full border border-white/10 ${callSession.isSpeakerOn ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`} onClick={toggleSpeaker}><Volume2 className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"><MonitorUp className="h-5 w-5" /></Button>
                    <Button type="button" size="icon" className="h-14 w-14 rounded-full bg-red-500 text-white hover:bg-red-600" onClick={() => closeCall(true)}><PhoneOff className="h-5 w-5" /></Button>
                  </div>
                )}
              </div>
              <aside className="border-l border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="mb-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Call overview</div>
                  <div className="mt-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <img src={callSession.peerAvatar} alt={callSession.peerName} className="h-14 w-14 rounded-[18px] border border-white/10 object-cover" />
                      <div>
                        <div className="text-base font-semibold text-white">{callSession.peerName}</div>
                        <div className="mt-1 text-sm text-slate-300">{callSession.mode === "video" ? "Cuoc goi video" : "Cuoc goi thoai"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Trang thai</div>
                    <div className="mt-2 text-sm font-semibold text-white">{callSession.status === "incoming" ? "Dang goi den" : callSession.status === "connecting" ? "Dang ket noi" : "Dang hoat dong"}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Micro</div>
                    <div className="mt-2 text-sm font-semibold text-white">{callSession.isMuted ? "Dang tat" : "Dang bat"}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Camera</div>
                    <div className="mt-2 text-sm font-semibold text-white">{callSession.mode === "audio" ? "Khong su dung" : callSession.isCameraOff ? "Tam tat" : "Dang bat"}</div>
                  </div>
                </div>
                <Separator className="my-6 bg-white/10" />
                <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-500/10 p-4">
                  <div className="text-sm font-semibold text-white">WebRTC Connected</div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">He thong da duoc tich hop WebRTC (Peer-to-Peer). Hien tai cac luong stream da duoc ket noi qua STOMP / WebSocket signaling.</p>
                </div>
                {callSession.error && (
                  <div className="mt-4 rounded-[24px] border border-red-300/20 bg-red-500/10 p-4">
                    <div className="text-sm font-semibold text-white">Luu y quyen truy cap</div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{callSession.error}</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}