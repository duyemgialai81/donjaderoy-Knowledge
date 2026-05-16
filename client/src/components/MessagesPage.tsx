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

  // ==================== WEBSOCKET CONNECTION ====================
  useEffect(() => {
    if (!currentUserId) return;
    const token = localStorage_service.getAuthToken();
    if (!token) return;
    if (stompClientRef.current?.active) {
      stompClientRef.current.deactivate();
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'https://donjaderoy81-knowledge.hf.space/ws'),
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

  // ==================== HANDLE SEND MESSAGE ====================
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

  // ==================== IMPROVED UI - RESPONSIVE ====================
  return (
    <div className="messenger-page h-full min-h-0 bg-gradient-to-br from-orange-50/30 to-white px-2 py-2 md:px-3 md:py-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px]">
        <div className="flex h-full min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-[32px] border border-orange-100/80 bg-white shadow-xl">
          
          {/* SIDEBAR - Improved mobile responsiveness */}
          <aside className={`${selectedChat ? "hidden lg:flex" : "flex"} messenger-sidebar w-full shrink-0 flex-col border-r border-orange-100 bg-white lg:w-[320px] xl:w-[360px]`}>
            <div className="border-b border-orange-100 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700 sm:mb-2 sm:gap-2 sm:px-3 sm:py-1 sm:text-[11px]">
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Message Studio
                  </div>
                  <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Tin nhan</h1>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:mt-1 sm:text-sm">Hop thu trung tam cho trao doi</p>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-orange-100 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600 sm:h-10 sm:w-10"><MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
              </div>
              
              {/* Insight Cards - Better mobile layout */}
              <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                {insightCards.map((card) => (
                  <div key={card.label} className="rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-2 shadow-sm sm:p-3">
                    <div className={`mb-2 h-1 rounded-full bg-gradient-to-r ${card.accent} sm:mb-3`} />
                    <div className="text-base font-semibold text-slate-950 sm:text-xl">{card.value}</div>
                    <div className="text-[10px] font-medium text-slate-500 sm:text-xs">{card.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-4 sm:w-4" />
                <Input 
                  placeholder="Tim nguoi dung..." 
                  className="h-10 rounded-xl border-orange-100 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-500 sm:h-12 sm:rounded-2xl sm:pl-11" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              
              {!isSearchMode ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 w-full sm:mt-4">
                  <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-slate-100 p-0.5 sm:h-12 sm:rounded-2xl sm:p-1">
                    <TabsTrigger value="inbox" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm sm:rounded-xl sm:text-sm">Hop thu</TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm sm:rounded-xl sm:text-sm">Tin cho</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                  Dang tim kiem "{searchQuery.trim()}"
                </div>
              )}
            </div>
            
            {/* Conversation List - Improved scrolling */}
            <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3">
              {isLoadingChats || isSearching ? (
                <div className="flex h-full min-h-[280px] items-center justify-center sm:min-h-[320px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                    <Loader2 className="h-3 w-3 animate-spin text-orange-500 sm:h-4 sm:w-4" /> Dang dong bo hoi thoai...
                  </div>
                </div>
              ) : displayList.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {displayList.map((chat) => {
                    const isActive = selectedChat?.id === chat.id;
                    const avatarUrl = getAvatarUrl(chat.avatar, chat.targetUserId || chat.id);
                    return (
                      <button 
                        key={chat.id} 
                        type="button" 
                        onClick={() => { setSelectedChatId(chat.id); setShowInfo(false); }} 
                        className={`w-full rounded-2xl sm:rounded-[26px] border p-2.5 text-left transition-all active:scale-[0.98] sm:p-3 ${
                          isActive 
                            ? "border-orange-200 bg-gradient-to-br from-orange-50/80 to-white shadow-lg" 
                            : "border-transparent bg-white hover:border-orange-100 hover:bg-orange-50/30"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className="relative shrink-0">
                            <img 
                              src={avatarUrl} 
                              alt={chat.name} 
                              className="h-12 w-12 rounded-2xl border border-orange-100 object-cover shadow-sm sm:h-14 sm:w-14 sm:rounded-[20px]" 
                            />
                            {chat.isOnline && chat.status !== "pending" && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 sm:h-4 sm:w-4 sm:border-[3px]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-950 sm:text-base">{chat.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${
                                    chat.status === "pending" 
                                      ? "bg-orange-100 text-orange-700" 
                                      : chat.unread 
                                        ? "bg-orange-100 text-orange-700" 
                                        : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {chat.status === "pending" ? "Cho phe duyet" : chat.unread ? "Tin moi" : "On dinh"}
                                  </span>
                                  {chat.time && <span className="text-[9px] text-slate-400 sm:text-[11px]">{chat.time}</span>}
                                </div>
                              </div>
                              {chat.unread ? (
                                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-950 px-1.5 text-[9px] font-semibold text-white sm:h-6 sm:min-w-[24px] sm:px-2 sm:text-[11px]">
                                  {chat.unread}
                                </span>
                              ) : null}
                            </div>
                            <p className="messenger-preview mt-2 text-xs leading-5 text-slate-500 sm:mt-3 sm:text-sm">
                              {typingUsers[chat.id] ? "Dang nhap noi dung..." : chat.lastMessage || "Nhan de mo cuoc tro chuyen ngay."}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-orange-100 bg-orange-50/30 px-4 text-center sm:min-h-[340px] sm:rounded-[28px] sm:px-8">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm sm:mb-4 sm:h-20 sm:w-20 sm:rounded-3xl">
                    <Inbox className="h-6 w-6 text-orange-500 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-base font-semibold text-slate-950 sm:text-lg">
                    {isSearchMode ? "Khong tim thay ket qua" : "Chua co hoi thoai nao"}
                  </div>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm">
                    {isSearchMode 
                      ? "Thu mo rong tu khoa hoac bat dau hoi thoai tu danh sach ban be" 
                      : "Khi ban mo cuoc tro chuyen moi, tat ca tin nhan se duoc tap trung tai day"}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CHAT THREAD - Improved mobile layout */}
          <section className={`${selectedChat ? "flex" : "hidden lg:flex"} messenger-thread min-w-0 flex-1 flex-col bg-white`}>
            {selectedChat ? (
              <>
                {/* Chat Header - Better on mobile */}
                <div className="sticky top-0 z-10 border-b border-orange-100 bg-white/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 lg:hidden active:scale-95" 
                        onClick={() => setSelectedChatId(null)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="relative shrink-0">
                        <img 
                          src={selectedChatAvatar} 
                          alt={selectedChat.name} 
                          className="h-10 w-10 rounded-xl border border-orange-100 object-cover shadow-sm sm:h-12 sm:w-12 sm:rounded-[20px]" 
                        />
                        {selectedChat.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 sm:h-3.5 sm:w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h2 className="truncate text-base font-semibold text-slate-950 sm:text-lg">{selectedChat.name}</h2>
                          <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 sm:px-2.5 sm:py-1 sm:text-[11px]">
                            {selectedChat.status === "pending" ? "Tin cho phe duyet" : "Hoi thoai dang mo"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">{selectedResponseState}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 sm:h-10 sm:w-10" 
                        onClick={() => startCall("audio")}
                      >
                        <Phone className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full border border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 sm:h-10 sm:w-10" 
                        onClick={() => startCall("video")}
                      >
                        <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className={`h-9 w-9 rounded-full border border-orange-100 bg-white transition-colors sm:h-10 sm:w-10 ${
                          showInfo ? "text-orange-600 ring-2 ring-orange-200" : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                        }`} 
                        onClick={() => setShowInfo((p) => !p)}
                      >
                        <Info className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Highlights - Scrollable on mobile */}
                  <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 sm:mt-4 sm:flex-wrap sm:gap-2 sm:pb-0">
                    {selectedHighlights.map((item) => (
                      <div key={item.title} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50/70 px-2 py-1.5 text-[10px] font-medium text-slate-600 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs">
                        <item.icon className="h-3 w-3 text-orange-500 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden text-slate-400 sm:inline">{item.title}</span>
                        <span className="text-slate-800 sm:ml-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Messages Area - Better scrolling */}
                    <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-5">
                      {isLoadingMessages ? (
                        <div className="flex h-full min-h-[280px] items-center justify-center sm:min-h-[320px]">
                          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                            <Loader2 className="h-3 w-3 animate-spin text-orange-500 sm:h-4 sm:w-4" /> Dang tai lich su tin nhan...
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="mx-auto flex h-full min-h-[360px] max-w-2xl flex-col items-center justify-center px-3 text-center sm:min-h-[420px]">
                          <div className="relative mb-4 sm:mb-6">
                            <div className="absolute inset-0 scale-125 rounded-full bg-orange-200/35 blur-2xl" />
                            <img 
                              src={selectedChatAvatar} 
                              alt={selectedChat.name} 
                              className="relative h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-xl sm:h-24 sm:w-24 sm:rounded-[28px]" 
                            />
                          </div>
                          <div className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700 sm:px-4 sm:py-2 sm:text-xs">
                            Khoi dong cuoc tro chuyen
                          </div>
                          <h3 className="mt-4 text-xl font-semibold text-slate-950 sm:mt-5 sm:text-2xl">{selectedChat.name}</h3>
                          <p className="mt-2 max-w-xl text-xs leading-6 text-slate-500 sm:mt-3 sm:text-sm">
                            Day la khung chat da san sang cho goi video, goi thoai va trao doi tai lieu.
                          </p>
                          <div className="mt-6 grid w-full gap-2 sm:mt-8 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                            {starterPrompts.map((prompt) => (
                              <button 
                                key={prompt} 
                                type="button" 
                                onClick={() => handleQuickReply(prompt)} 
                                className="rounded-2xl p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:rounded-3xl sm:p-4"
                              >
                                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-orange-100 text-orange-600 sm:mb-3 sm:h-9 sm:w-9 sm:rounded-2xl">
                                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                                <p className="text-xs leading-5 text-slate-700 sm:text-sm">{prompt}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto max-w-[820px] space-y-1.5">
                          <div className="flex justify-center">
                            <div className="rounded-full border border-orange-100 bg-white px-3 py-1 text-[10px] font-medium text-slate-500 shadow-sm sm:px-4 sm:py-2 sm:text-xs">
                              Dong trao doi hom nay
                            </div>
                          </div>
                          {messages.map((message, index) => {
                            const isMe = message.senderId === "me";
                            const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId);
                            return (
                              <div key={message.id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                                {!isMe && (
                                  <div className="mr-1.5 flex w-8 shrink-0 items-end sm:mr-2 sm:w-10">
                                    {showAvatar ? (
                                      <img 
                                        src={selectedChatAvatar} 
                                        alt="" 
                                        className="h-7 w-7 rounded-xl border border-orange-100 object-cover shadow-sm sm:h-9 sm:w-9 sm:rounded-2xl" 
                                      />
                                    ) : (
                                      <div className="h-7 w-7 sm:h-9 sm:w-9" />
                                    )}
                                  </div>
                                )}
                                <div className="relative max-w-[80%] sm:max-w-[72%]">
                                  <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    <span className="shrink-0 pb-1 text-[9px] font-medium text-slate-400 sm:text-[11px]">{message.time}</span>
                                    <div className={`rounded-2xl px-3 py-1.5 text-[13px] leading-5 sm:rounded-[22px] sm:px-4 sm:py-1.5 sm:text-[14px] sm:leading-6 ${
                                      isMe 
                                        ? "messenger-bubble-outgoing rounded-br-lg bg-orange-500 text-white" 
                                        : "messenger-bubble-incoming rounded-bl-lg bg-slate-100 text-slate-800"
                                    }`}>
                                      {message.text}
                                    </div>
                                  </div>

                                  {/* Reaction Picker - Improved position on mobile */}
                                  <button
                                    type="button"
                                    onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                                    className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-md border p-0.5 text-base hover:scale-110 sm:p-1 sm:text-lg"
                                  >
                                    😊
                                  </button>

                                  {showReactionPicker === message.id && (
                                    <div 
                                      className="absolute bottom-full mb-1 flex gap-0.5 bg-white rounded-full shadow-lg border p-1 z-10 sm:mb-2 sm:gap-1 sm:p-1.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {REACTION_EMOJIS.map(emoji => (
                                        <button 
                                          key={emoji} 
                                          type="button" 
                                          onClick={() => handleToggleReaction(message.id, emoji)} 
                                          className="text-sm hover:scale-125 transition-transform p-0.5 sm:text-lg sm:p-1"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reactions Display */}
                                  {message.reactions && Object.entries(message.reactions).filter(([, count]) => count > 0).length > 0 && (
                                    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                      {Object.entries(message.reactions).map(([emoji, count]) => count > 0 && (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleToggleReaction(message.id, emoji)}
                                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition sm:gap-1 sm:px-2 sm:py-0.5 ${
                                            message.userReactions?.[emoji]
                                              ? "bg-orange-100 border-orange-300 text-orange-700"
                                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                                          }`}
                                        >
                                          <span className="text-xs sm:text-sm">{emoji}</span>
                                          <span className="text-[10px] font-medium sm:text-xs">{count}</span>
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
                              <div className="mr-1.5 flex w-8 shrink-0 items-end sm:mr-2 sm:w-10">
                                <img 
                                  src={selectedChatAvatar} 
                                  alt="" 
                                  className="h-7 w-7 rounded-xl border border-orange-100 object-cover shadow-sm sm:h-9 sm:w-9 sm:rounded-2xl" 
                                />
                              </div>
                              <div className="flex items-center gap-0.5 rounded-2xl rounded-bl-lg border border-white bg-white px-3 py-2 shadow-sm sm:gap-1 sm:rounded-[24px] sm:px-4 sm:py-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: "0s" }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: "0.12s" }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce sm:h-2 sm:w-2" style={{ animationDelay: "0.24s" }} />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} className="h-1" />
                        </div>
                      )}
                    </div>

                    {/* Input Area - Improved mobile */}
                    {selectedChat.status === "pending" ? (
                      <div className="border-t border-orange-100 bg-white/90 px-3 py-3 sm:px-4 sm:py-5">
                        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/90 to-white p-4 text-center shadow-sm sm:rounded-[28px] sm:p-6">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                            <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7" />
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Chap nhan tin nhan cho?</h3>
                          <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm">
                            Khi chap nhan, hoi thoai se duoc dua vao hop thu chinh va mo khoa goi audio, video.
                          </p>
                          <div className="mt-4 flex w-full max-w-sm gap-2 sm:mt-5 sm:gap-3">
                            <Button variant="outline" className="h-9 flex-1 rounded-xl border-orange-100 bg-white hover:bg-orange-50 sm:h-11 sm:rounded-2xl">Tu choi</Button>
                            <Button className="h-9 flex-1 rounded-xl bg-orange-500 text-white hover:bg-orange-600 sm:h-11 sm:rounded-2xl">
                              <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Chap nhan
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-orange-100 bg-white/95 px-2 py-2 sm:px-4 sm:py-4">
                        <div className="mx-auto max-w-[820px]">
                          {/* Quick Replies - Scrollable on mobile */}
                          <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2">
                            {quickReplies.map((reply) => (
                              <button 
                                key={reply} 
                                type="button" 
                                onClick={() => handleQuickReply(reply)} 
                                className="rounded-full border border-orange-100 bg-orange-50/70 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:border-orange-200 hover:bg-orange-100 hover:text-orange-700 sm:px-3 sm:py-2 sm:text-xs"
                              >
                                {reply}
                              </button>
                            ))}
                          </div>
                          
                          {/* Message Input Form */}
                          <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 shrink-0 rounded-xl border border-orange-100 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600 sm:h-11 sm:w-11 sm:rounded-2xl"
                            >
                              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <div className="messenger-blue-ring flex flex-1 items-end rounded-2xl border border-orange-100 bg-white px-3 py-1.5 shadow-sm transition sm:rounded-[28px] sm:px-4 sm:py-2">
                              <input 
                                type="text" 
                                placeholder="Nhap tin nhan..." 
                                value={messageInput} 
                                onChange={handleInputChange} 
                                className="min-h-[24px] flex-1 bg-transparent py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-[28px] sm:py-2 sm:text-sm" 
                              />
                              <button 
                                type="button" 
                                className="mb-0.5 ml-2 rounded-full p-0.5 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600 sm:mb-1 sm:ml-3 sm:p-1"
                              >
                                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>
                            {messageInput.trim() ? (
                              <Button 
                                type="submit" 
                                size="icon" 
                                className="h-9 w-9 shrink-0 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600 sm:h-11 sm:w-11 sm:rounded-2xl"
                              >
                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            ) : (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 shrink-0 rounded-xl border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 sm:h-11 sm:w-11 sm:rounded-2xl"
                              >
                                <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                            )}
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info Panel - Improved mobile slide-in */}
                  {showInfo && (
                    <>
                      <button 
                        type="button" 
                        aria-label="Dong thong tin" 
                        className="absolute inset-0 z-10 bg-slate-950/40 backdrop-blur-sm 2xl:hidden" 
                        onClick={() => setShowInfo(false)} 
                      />
                      <aside className="messenger-info-panel absolute inset-y-0 right-0 z-20 flex w-full max-w-[300px] flex-col border-l border-orange-100 bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:max-w-[320px] 2xl:static 2xl:shadow-none">
                        <div className="border-b border-orange-100 px-4 py-3 sm:px-5 sm:py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-950">Thong tin hoi thoai</div>
                              <div className="text-xs text-slate-500">Profile nhanh va hanh dong</div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 sm:h-9 sm:w-9" onClick={() => setShowInfo(false)}>
                              <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/90 to-white p-4 text-center shadow-sm sm:rounded-[28px] sm:p-5">
                            <img 
                              src={selectedChatAvatar} 
                              alt={selectedChat.name} 
                              className="mx-auto h-16 w-16 rounded-xl border-4 border-white object-cover shadow-lg sm:h-20 sm:w-20 sm:rounded-[24px]" 
                            />
                            <h3 className="mt-3 text-base font-semibold text-slate-950 sm:mt-4 sm:text-lg">{selectedChat.name}</h3>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{selectedResponseState}</p>
                            <div className="mt-3 flex justify-center gap-1.5 sm:mt-4 sm:gap-2">
                              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-orange-700 sm:px-3 sm:py-1 sm:text-xs">
                                {selectedChat.status === "pending" ? "Cho phe duyet" : "Ket noi an toan"}
                              </span>
                              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-3 sm:py-1 sm:text-xs">
                                {messages.length} tin nhan
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
                            {selectedHighlights.map((item) => (
                              <div key={item.title} className="rounded-xl border border-orange-100 bg-orange-50/60 p-2 text-center sm:rounded-2xl sm:p-3">
                                <item.icon className="mx-auto h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                                <div className="mt-1 text-[10px] font-medium text-slate-400 sm:mt-2 sm:text-xs">{item.title}</div>
                                <div className="mt-0.5 text-xs font-semibold text-slate-900 sm:mt-1 sm:text-sm">{item.value}</div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-5 sm:mt-6">
                            <div className="mb-2 text-xs font-semibold text-slate-900 sm:mb-3 sm:text-sm">Quick actions</div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <Button variant="ghost" className="h-10 w-full justify-start rounded-xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50 sm:h-12 sm:rounded-2xl">
                                <UserIcon className="mr-2 h-3.5 w-3.5 text-slate-400 sm:mr-3 sm:h-4 sm:w-4" /> Xem trang ca nhan
                              </Button>
                              <Button variant="ghost" className="h-10 w-full justify-start rounded-xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50 sm:h-12 sm:rounded-2xl" onClick={() => startCall("audio")}>
                                <Phone className="mr-2 h-3.5 w-3.5 text-slate-400 sm:mr-3 sm:h-4 sm:w-4" /> Bat dau goi thoai
                              </Button>
                              <Button variant="ghost" className="h-10 w-full justify-start rounded-xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50 sm:h-12 sm:rounded-2xl" onClick={() => startCall("video")}>
                                <Video className="mr-2 h-3.5 w-3.5 text-slate-400 sm:mr-3 sm:h-4 sm:w-4" /> Bat dau video call
                              </Button>
                              <Button variant="ghost" className="h-10 w-full justify-start rounded-xl border border-orange-100 bg-white text-slate-700 hover:bg-orange-50 sm:h-12 sm:rounded-2xl">
                                <Archive className="mr-2 h-3.5 w-3.5 text-slate-400 sm:mr-3 sm:h-4 sm:w-4" /> Luu tru hoi thoai
                              </Button>
                            </div>
                          </div>
                          
                          <Separator className="my-4 sm:my-6" />
                          
                          <div className="rounded-xl border border-red-100 bg-red-50/70 p-3 sm:rounded-2xl sm:p-4">
                            <div className="text-xs font-semibold text-red-700 sm:text-sm">Bao mat va kiem soat</div>
                            <p className="mt-1 text-xs leading-5 text-red-600 sm:mt-2 sm:text-sm">
                              Neu phat hien spam hoac quang cao, ban co the chan nguoi dung nay.
                            </p>
                            <Button variant="ghost" className="mt-2 h-9 w-full justify-start rounded-xl bg-white text-red-600 hover:bg-red-100 hover:text-red-700 sm:mt-3 sm:h-11 sm:rounded-2xl">
                              <X className="mr-2 h-3.5 w-3.5" /> Chan nguoi dung
                            </Button>
                          </div>
                        </div>
                      </aside>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl shadow-orange-100 sm:mb-6 sm:h-24 sm:w-24 sm:rounded-[28px]">
                    <MessageCircle className="h-8 w-8 text-orange-500 sm:h-10 sm:w-10" />
                  </div>
                  <div className="mx-auto max-w-sm rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 sm:px-4 sm:py-2 sm:text-xs">
                    Messaging hub
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-slate-950 sm:mt-6 sm:text-3xl">Tap trung tat ca trao doi</h2>
                  <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:mt-4 sm:text-sm">
                    Chon mot hoi thoai ben trai de nhan tin, goi audio, video call va quan ly thong tin.
                  </p>
                  <div className="mt-6 grid gap-2 text-left sm:mt-8 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                    <div className="rounded-2xl border border-orange-100 bg-white/95 p-3 shadow-sm sm:rounded-[28px] sm:p-5">
                      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
                        <BellRing className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="text-base font-semibold text-slate-950 sm:text-lg">{totalUnread}</div>
                      <div className="text-[10px] font-medium text-slate-500 sm:mt-1 sm:text-sm">Tin nhan can xu ly</div>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-white/95 p-3 shadow-sm sm:rounded-[28px] sm:p-5">
                      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-orange-600 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="text-base font-semibold text-slate-950 sm:text-lg">Audio / Video</div>
                      <div className="text-[10px] font-medium text-slate-500 sm:mt-1 sm:text-sm">WebRTC Ready</div>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-white/95 p-3 shadow-sm sm:rounded-[28px] sm:p-5">
                      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
                        <Clock3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="text-base font-semibold text-slate-950 sm:text-lg">{pendingConversations.length}</div>
                      <div className="text-[10px] font-medium text-slate-500 sm:mt-1 sm:text-sm">Yeu cau dang cho</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* CALL MODAL - Fully responsive redesign */}
      {callSession && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-2 py-4 backdrop-blur-md sm:px-4 sm:py-6">
          <div className="relative w-full max-w-5xl overflow-y-auto max-h-[95vh] rounded-2xl border border-orange-200/20 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl sm:rounded-[32px]">
            <div className="flex flex-col lg:grid lg:grid-cols-[1.6fr_0.8fr]">
              {/* Video/Audio Area */}
              <div className="relative flex min-h-[400px] flex-col justify-between overflow-hidden p-3 sm:p-4 lg:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.15),_transparent_30%)]" />
                
                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full border border-orange-200/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-orange-100 sm:gap-2 sm:px-3 sm:py-1 sm:text-[11px]">
                    {callSession.mode === "video" ? <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    {callSession.mode === "video" ? "Video call" : "Audio call"}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-10 sm:w-10" 
                    onClick={() => closeCall(true)}
                  >
                    <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </Button>
                </div>

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-4 sm:py-6">
                  {callSession.status === "incoming" ? (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="absolute inset-0 scale-150 rounded-full bg-orange-400/30 blur-3xl animate-pulse" />
                        <img 
                          src={callSession.peerAvatar} 
                          alt="Avatar" 
                          className="relative h-24 w-24 rounded-2xl border-4 border-white/15 object-cover shadow-2xl sm:h-32 sm:w-32 sm:rounded-[32px]" 
                        />
                      </div>
                      <div className="text-xl font-semibold text-white sm:text-3xl">{callSession.peerName}</div>
                      <div className="mt-2 text-xs text-slate-300 sm:mt-3 sm:text-sm">
                        Dang goi {callSession.mode === "video" ? "Video" : "Thoai"}...
                      </div>
                      <div className="mt-6 flex gap-4 sm:mt-8 sm:gap-6">
                        <Button size="icon" className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 sm:h-16 sm:w-16" onClick={rejectCall}>
                          <PhoneOff className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                        </Button>
                        <Button size="icon" className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 sm:h-16 sm:w-16" onClick={acceptCall}>
                          {callSession.mode === "video" ? <Video className="h-5 w-5 text-white sm:h-6 sm:w-6" /> : <Phone className="h-5 w-5 text-white sm:h-6 sm:w-6" />}
                        </Button>
                      </div>
                    </div>
                  ) : callSession.mode === "video" ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 shadow-2xl sm:rounded-2xl lg:rounded-[30px]">
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-slate-900/70" />
                      <div className="flex h-[280px] items-center justify-center sm:h-[360px] lg:h-[430px]">
                        {callSession.hasMediaPermission && !callSession.isCameraOff ? (
                          <>
                            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                            <div className="absolute bottom-2 right-2 h-20 w-16 overflow-hidden rounded-lg border-2 border-white/20 bg-slate-800 shadow-xl sm:bottom-4 sm:right-4 sm:h-28 sm:w-24 sm:rounded-xl lg:rounded-2xl">
                              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-200 px-4">
                            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 sm:mb-4 sm:h-20 sm:w-20 sm:rounded-2xl">
                              <CameraOff className="h-6 w-6 sm:h-8 sm:w-8" />
                            </div>
                            <div className="text-sm font-semibold text-center sm:text-base lg:text-lg">
                              Camera dang tat hoac khong the truy cap
                            </div>
                          </div>
                        )}
                        {callSession.status === "connecting" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500 sm:h-8 sm:w-8" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 rounded-xl bg-black/45 px-2 py-1.5 text-left text-white backdrop-blur sm:bottom-4 sm:left-4 sm:rounded-2xl sm:px-3 sm:py-2">
                        <div className="text-[8px] uppercase tracking-[0.14em] text-slate-300 sm:text-[10px] lg:text-xs">Live WebRTC</div>
                        <div className="mt-0.5 text-[10px] font-semibold sm:mt-1 sm:text-xs lg:text-sm">
                          {currentUser?.name || "Tai khoan hien tai"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="absolute inset-0 scale-150 rounded-full bg-orange-400/30 blur-3xl" />
                        <img 
                          src={callSession.peerAvatar} 
                          alt={callSession.peerName} 
                          className="relative h-24 w-24 rounded-2xl border-4 border-white/15 object-cover shadow-2xl sm:h-32 sm:w-32 sm:rounded-[32px]" 
                        />
                      </div>
                      <div className="text-xl font-semibold text-white sm:text-3xl">{callSession.peerName}</div>
                      <div className="mt-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-slate-200 sm:mt-3 sm:px-4 sm:py-2 sm:text-sm">
                        {callSession.status === "connecting" ? "Dang ket noi..." : `Dang goi ${formatCallDuration(callSession.elapsedSeconds)}`}
                      </div>
                      <audio ref={remoteAudioRef} autoPlay playsInline />
                    </div>
                  )}
                </div>

                {/* Call Controls - Responsive */}
                {callSession.status !== "incoming" && (
                  <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pb-2 sm:gap-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className={`h-10 w-10 rounded-full border border-white/10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${
                        callSession.isMuted ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
                      }`} 
                      onClick={toggleMute}
                    >
                      {callSession.isMuted ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>
                    {callSession.mode === "video" && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className={`h-10 w-10 rounded-full border border-white/10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${
                          callSession.isCameraOff ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
                        }`} 
                        onClick={toggleCamera}
                      >
                        {callSession.isCameraOff ? <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Video className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </Button>
                    )}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className={`h-10 w-10 rounded-full border border-white/10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${
                        callSession.isSpeakerOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`} 
                      onClick={toggleSpeaker}
                    >
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                    >
                      <MonitorUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button 
                      type="button" 
                      size="icon" 
                      className="h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600 sm:h-12 sm:w-12 lg:h-14 lg:w-14" 
                      onClick={() => closeCall(true)}
                    >
                      <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Call Info Sidebar */}
              <aside className="border-t border-white/10 bg-white/5 p-4 backdrop-blur lg:border-l lg:border-t-0 lg:p-6">
                <div className="mb-4 sm:mb-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 sm:text-sm">Call overview</div>
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:mt-3 sm:rounded-2xl sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <img 
                        src={callSession.peerAvatar} 
                        alt={callSession.peerName} 
                        className="h-10 w-10 rounded-lg border border-white/10 object-cover sm:h-12 sm:w-12 sm:rounded-xl lg:h-14 lg:w-14 lg:rounded-[18px]" 
                      />
                      <div>
                        <div className="text-sm font-semibold text-white sm:text-base">{callSession.peerName}</div>
                        <div className="mt-0.5 text-xs text-slate-300 sm:mt-1 sm:text-sm">
                          {callSession.mode === "video" ? "Cuoc goi video" : "Cuoc goi thoai"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-2xl sm:p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Trang thai</div>
                    <div className="mt-1 text-xs font-semibold text-white sm:mt-2 sm:text-sm">
                      {callSession.status === "incoming" ? "Dang goi den" : callSession.status === "connecting" ? "Dang ket noi" : "Dang hoat dong"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-2xl sm:p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Micro</div>
                    <div className="mt-1 text-xs font-semibold text-white sm:mt-2 sm:text-sm">
                      {callSession.isMuted ? "Dang tat" : "Dang bat"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-2xl sm:p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:text-xs">Camera</div>
                    <div className="mt-1 text-xs font-semibold text-white sm:mt-2 sm:text-sm">
                      {callSession.mode === "audio" ? "Khong su dung" : callSession.isCameraOff ? "Tam tat" : "Dang bat"}
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4 bg-white/10 sm:my-6" />
                
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 sm:rounded-2xl sm:p-4">
                  <div className="text-xs font-semibold text-white sm:text-sm">WebRTC Connected</div>
                  <p className="mt-1 text-xs leading-5 text-slate-200 sm:mt-2 sm:text-sm">
                    He thong da duoc tich hop WebRTC (Peer-to-Peer). Hien tai cac luong stream da duoc ket noi qua STOMP / WebSocket signaling.
                  </p>
                </div>
                
                {callSession.error && (
                  <div className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
                    <div className="text-xs font-semibold text-white sm:text-sm">Luu y quyen truy cap</div>
                    <p className="mt-1 text-xs leading-5 text-slate-200 sm:mt-2 sm:text-sm">{callSession.error}</p>
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