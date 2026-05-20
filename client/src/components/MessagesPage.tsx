import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Camera,
  Check,
  ChevronLeft,
  Image as ImageIcon,
  Copy,
  FileText,
  Inbox,
  Info,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Phone,
  PhoneOff,
  Search,
  Send,
  ScreenShare,
  ScreenShareOff,
  ShieldAlert,
  Smile,
  SwitchCamera,
  ThumbsUp,
  Reply,
  Trash2,
  Pencil,
  User as UserIcon,
  Video,
  VideoOff,
  Volume2,
  X,
  Plus,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import api, { normalizeAssetUrl, normalizeAvatarUrl } from "../lib/api";
import { localStorage_service } from "../lib/localStorage";
import { clearPendingCall, createSockJsConnection, INCOMING_CALL_EVENT, readPendingCall } from "../lib/realtime";

// ==================== INTERFACES ====================
interface MessagesPageProps {
  readonly currentUser?: any;
}

interface ConversationItem {
  id: string;
  type?: "direct" | "group" | string;
  targetUserId?: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  status?: "accepted" | "pending" | string;
  isOnline?: boolean;
  memberCount?: number;
}

interface SearchUserItem {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface MessageItem {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  text: string;
  time: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  replyToMessageId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  messageType?: string;
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
  isScreenSharing: boolean;
  cameraFacing: "user" | "environment";
  isSpeakerOn: boolean;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  hasMediaPermission: boolean;
  error: string | null;
}

// ==================== CONSTANTS ====================
const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🎉', '👎', '😡', '⭐', '🔥'];

// ── ORANGE THEME ──
const SAFE_REACTION_EMOJIS = [
  "\u2764\uFE0F",
  "\uD83D\uDE06",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDE21",
  "\uD83D\uDC4D",
  "\uD83C\uDF89",
  "\uD83D\uDC4E",
  "\u2B50",
  "\uD83D\uDD25",
];

const ORANGE = "#FF6B35";
const ORANGE_LIGHT = "#FFF0EB";
const ORANGE_MID = "#FF8A5C";
const ORANGE_DARK = "#E85520";

const CHAT_BACKGROUNDS = [
  { id: "soft", label: "Sáng", value: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" },
  { id: "warm", label: "Ấm", value: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)" },
  { id: "mint", label: "Mint", value: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" },
  { id: "sky", label: "Sky", value: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)" },
  { id: "slate", label: "Xám", value: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)" },
];

const CUSTOM_CHAT_BACKGROUND_STORAGE_KEY = "ksp_chat_background_image";

const CHAT_BACKGROUND_STORAGE_KEY = "ksp_chat_background";

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

const CHAT_LIST_CACHE_TTL_MS = 45_000;

type ExpiringMemoryCache<T> = Map<string, { savedAt: number; value: T }>;

const chatListMemoryCache: ExpiringMemoryCache<ConversationItem[]> = new Map();

function cloneCacheValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readExpiringCache<T>(cache: ExpiringMemoryCache<T>, key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return cloneCacheValue(entry.value);
}

function writeExpiringCache<T>(cache: ExpiringMemoryCache<T>, key: string, value: T) {
  cache.set(key, { savedAt: Date.now(), value: cloneCacheValue(value) });
}

export default function MessagesPage({ currentUser }: MessagesPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatFilter, setChatFilter] = useState<"all" | "unread" | "pending" | "favorite">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoTab, setInfoTab] = useState<"info" | "chat">("info");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [customChatBackground, setCustomChatBackground] = useState(() => {
    try {
      return localStorage.getItem(CUSTOM_CHAT_BACKGROUND_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
  const [chatBackgroundId, setChatBackgroundId] = useState(() => {
    try {
      return localStorage.getItem(CHAT_BACKGROUND_STORAGE_KEY) || "soft";
    } catch {
      return "soft";
    }
  });

  const stompClientRef = useRef<Client | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const chatBackgroundInputRef = useRef<HTMLInputElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const messagesConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const callSessionRef = useRef<CallSession | null>(null);
  const realtimeMessageIdsRef = useRef<Set<string>>(new Set());

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const acceptCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toId = (value: unknown) => (value === undefined || value === null ? "" : String(value));
  const currentUserId = toId(currentUser?.id);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { callSessionRef.current = callSession; }, [callSession]);
  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;
    writeExpiringCache(chatListMemoryCache, `chat-list:${currentUserId}`, conversations);
  }, [conversations, currentUserId]);
  const dedupConversations = (list: ConversationItem[]) => {
    const map = new Map<string, ConversationItem>();
    list.forEach((c) => {
      const key = c.targetUserId ? String(c.targetUserId) : String(c.id);
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values());
  };

  const getAvatarUrl = (url?: string, id?: string) => {
    return normalizeAvatarUrl(url, id || "default");
  };

  const setConversationMessages = (
    conversationId: string | null,
    value: MessageItem[] | ((prev: MessageItem[]) => MessageItem[]),
  ) => {
    messagesConversationIdRef.current = conversationId;
    setMessages(value);
  };

  const parseRealtimePayload = (data: any) => {
    if (!data) return null;
    if (typeof data === "object") return data;
    const s = String(data).trim();
    if (!s || s === "undefined" || s === "null") return null;
    try { return JSON.parse(s); } catch { return null; }
  };

  const getConversationPeerId = (conversation?: Pick<ConversationItem, "id" | "targetUserId"> | null) => {
    if (!conversation) return "";
    const targetUserId = toId(conversation.targetUserId);
    if (targetUserId) return targetUserId;
    const conversationId = toId(conversation.id);
    return conversationId.startsWith("new_") ? conversationId.slice(4) : conversationId;
  };

  const getEventPeerId = (senderId?: unknown, receiverId?: unknown) => {
    const s = toId(senderId); const r = toId(receiverId);
    if (s && s === currentUserId) return r;
    if (r && r === currentUserId) return s;
    return s || r;
  };

  const doesEventMatchSelectedChat = (conversationId?: unknown, senderId?: unknown, receiverId?: unknown) => {
    const selectedId = toId(selectedChatIdRef.current);
    if (!selectedId) return false;
    if (toId(conversationId) === selectedId) return true;
    const sel = conversationsRef.current.find((c) => toId(c.id) === selectedId);
    const selPeerId = sel ? getConversationPeerId(sel) : selectedId.startsWith("new_") ? selectedId.slice(4) : "";
    const evPeerId = getEventPeerId(senderId, receiverId);
    return Boolean(selPeerId && evPeerId && selPeerId === evPeerId);
  };

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    return [
      ...conversations,
      ...searchResults.map((u) => ({
        id: `new_${toId(u.id)}`, targetUserId: toId(u.id),
        name: u.name, avatar: u.avatar, status: "accepted", isOnline: Boolean(u.isOnline),
      })),
    ].find((c) => c.id === selectedChatId);
  }, [conversations, searchResults, selectedChatId]);

  const selectedChatAvatar = selectedChat
    ? getAvatarUrl(selectedChat.avatar, getConversationPeerId(selectedChat) || selectedChat.id)
    : "";
  const selectedChatBackground = CHAT_BACKGROUNDS.find((item) => item.id === chatBackgroundId) || CHAT_BACKGROUNDS[0];
  const normalizedCustomChatBackground = customChatBackground ? (normalizeAssetUrl(customChatBackground) || customChatBackground) : "";
  const selectedChatBackgroundValue = normalizedCustomChatBackground
    ? `linear-gradient(rgba(248,250,252,0.84), rgba(248,250,252,0.84)), url("${normalizedCustomChatBackground}") center/cover`
    : selectedChatBackground.value;

  const updateChatBackground = (id: string) => {
    setChatBackgroundId(id);
    setCustomChatBackground("");
    try {
      localStorage.setItem(CHAT_BACKGROUND_STORAGE_KEY, id);
      localStorage.removeItem(CUSTOM_CHAT_BACKGROUND_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const updateCustomChatBackground = (url: string) => {
    const normalizedUrl = normalizeAssetUrl(url) || url;
    setCustomChatBackground(normalizedUrl);
    try {
      localStorage.setItem(CUSTOM_CHAT_BACKGROUND_STORAGE_KEY, normalizedUrl);
    } catch {
      // Ignore storage failures.
    }
  };

  const applyIncomingCallEvent = (ev: any) => {
    if (!ev || !currentUserId) return;
    const callId = toId(ev.callId);
    const senderId = toId(ev.senderId);
    if (!callId || !senderId || senderId === currentUserId) return;

    const parsedOffer = parseRealtimePayload(ev.offer || (ev.type === "offer" ? ev.signalData : null));
    if (parsedOffer) incomingOfferRef.current = parsedOffer;
    const storedCandidates = Array.isArray(ev.candidates) ? ev.candidates : [];
    const parsedCandidate = parseRealtimePayload(ev.candidate || ((ev.type === "ice-candidate" || ev.type === "ice") ? ev.signalData : null));
    if (storedCandidates.length > 0) iceCandidateQueueRef.current = storedCandidates;
    if (parsedCandidate) iceCandidateQueueRef.current.push(parsedCandidate);

    if (callSessionRef.current?.id === callId) return;
    const mode: CallMode = ev.callType === "audio" ? "audio" : "video";
    const caller = conversationsRef.current.find((c) => getConversationPeerId(c) === senderId);
    const incoming: CallSession = {
      id: callId,
      mode,
      status: "incoming",
      startedAt: null,
      elapsedSeconds: 0,
      isMuted: false,
      isCameraOff: mode === "audio",
      isScreenSharing: false,
      cameraFacing: "user",
      isSpeakerOn: true,
      peerId: senderId,
      peerName: ev.senderName || caller?.name || "Người gọi",
      peerAvatar: ev.senderAvatar || caller?.avatar || getAvatarUrl("", senderId),
      hasMediaPermission: true,
      error: null,
    };
    callSessionRef.current = incoming;
    setCallSession(incoming);
  };

  // ==================== DATA LOADING ====================
  const loadChatsAndFriends = async (options: { force?: boolean; silent?: boolean } = {}) => {
    if (!currentUserId) {
      setIsLoadingChats(false);
      return;
    }

    const cacheKey = `chat-list:${currentUserId}`;
    const cached = options.force ? null : readExpiringCache(chatListMemoryCache, cacheKey, CHAT_LIST_CACHE_TTL_MS);
    if (cached) {
      setConversations(cached);
      setIsLoadingChats(false);
      return;
    }

    if (!options.silent) setIsLoadingChats(true);
    try {
      let convs: ConversationItem[] = [];
      try {
        const res = await api.request("GET", "/api/chat/conversations");
        const raw = res?.data || (Array.isArray(res) ? res : []);
        convs = raw.map((c: any) => ({
          id: toId(c.id), type: c.type || "direct", targetUserId: toId(c.targetUserId) || undefined,
          name: c.type === "group" ? (c.groupName || "Nhóm chat") : (c.targetUserName || "Người dùng"), avatar: c.targetUserAvatar,
          lastMessage: c.lastMessage || "Bắt đầu cuộc trò chuyện mới.",
          time: c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          unread: c.unreadCount || 0, status: c.status || "accepted", isOnline: Boolean(c.targetIsOnline), memberCount: c.memberCount,
        }));
      } catch (e) { console.error(e); }

      let friends: any[] = [];
      try { friends = (await api.getMutualFollowersForChat()) || []; } catch (e) { console.error(e); }

      const final = [...convs];
      const existingIds = new Set(convs.map((c) => String(c.targetUserId || c.id)));
      friends.forEach((f: any) => {
        const fId = toId(f.id);
        if (!existingIds.has(fId)) {
          final.push({ id: `new_${fId}`, targetUserId: fId, name: f.name || "Người dùng", avatar: f.avatar, lastMessage: "Sẵn sàng mở cuộc trò chuyện.", time: "", unread: 0, isOnline: Boolean(f.isOnline), status: "accepted" });
        }
      });
      const nextConversations = dedupConversations(final);
      writeExpiringCache(chatListMemoryCache, cacheKey, nextConversations);
      setConversations(nextConversations);
    } finally {
      if (!options.silent) setIsLoadingChats(false);
    }
  };

  // ==================== ACCEPT / REJECT PENDING ====================
  const handleAcceptRequestLegacy = async () => {
    if (!selectedChat) return;
    setIsAcceptingRequest(true);
    const convId = selectedChat.id.startsWith("new_") ? "" : selectedChat.id;

    try {
      if (convId) await api.request("PUT", `/api/chat/conversations/${convId}/accept`);
      setConversations((prev) => prev.map((c) => c.id === selectedChat.id ? { ...c, status: "accepted" } : c));
      toast.success("Đã chấp nhận tin nhắn");
    } catch {
      setConversations((prev) => prev.map((c) => c.id === selectedChat.id ? { ...c, status: "accepted" } : c));
      toast.warning("Đã mở hội thoại trên giao diện. Backend cần deploy endpoint accept mới.");
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedChat) return;
    setIsAcceptingRequest(true);
    const convId = selectedChat.id.startsWith("new_") ? "" : selectedChat.id;

    try {
      if (!convId) throw new Error("Không thể chấp nhận hội thoại chưa có id.");
      const res = await api.request("PUT", `/api/chat/conversations/${convId}/accept`);
      const accepted = res?.data || {};
      setConversations((prev) => prev.map((c) => c.id === selectedChat.id ? { ...c, ...accepted, id: convId, status: "accepted", unread: c.unread } : c));
      await loadChatsAndFriends({ force: true });
      toast.success("Đã chấp nhận tin nhắn");
    } catch (error: any) {
      toast.error(error?.message || "Không thể chấp nhận tin nhắn.");
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedChat) return;
    const convId = selectedChat.id.startsWith("new_") ? "" : selectedChat.id;

    let succeeded = false;
    if (convId) {
      try {
        await api.request("POST", `/api/chat/conversations/${convId}/reject`);
        succeeded = true;
      } catch {
        succeeded = false;
      }
    }

    setConversations((prev) => prev.filter((c) => c.id !== selectedChat.id));
    setConversationMessages(null, []);
    setSelectedChatId(null);
    if (succeeded) toast.success("Đã từ chối tin nhắn");
    else toast.warning("Đã xóa khỏi giao diện. Backend cần deploy endpoint reject mới.");
  };

  // ==================== CALL SIGNALING ====================
  const sendCallSignal = (type: string, signalData: any = null, targetId: string, callId: string, callMode: CallMode) => {
    if (!stompClientRef.current?.connected) return;
    let convId = selectedChatIdRef.current?.startsWith("new_") ? "" : selectedChatIdRef.current || "";
    if (!convId && (type === "end" || type === "reject")) {
      const found = conversationsRef.current.find((c) => getConversationPeerId(c) === targetId);
      if (found && !found.id.startsWith("new_")) convId = found.id;
    }
    stompClientRef.current.publish({
      destination: "/app/chat.call",
      body: JSON.stringify({ callId, conversationId: convId, receiverId: targetId, type, callType: callMode, signalData }),
    });
  };

  const logCallStatusToChat = (session: CallSession, reason: "ended" | "missed" | "rejected") => {
    if (!stompClientRef.current?.connected) return;
    let logText = reason === "rejected"
      ? (session.mode === "video" ? "📹 Đã từ chối cuộc gọi video" : "📞 Đã từ chối cuộc gọi thoại")
      : (session.elapsedSeconds === 0 || reason === "missed")
      ? (session.mode === "video" ? "📹 Cuộc gọi video nhỡ" : "📞 Cuộc gọi thoại nhỡ")
      : `📞 Cuộc gọi kết thúc. Thời lượng: ${formatCallDuration(session.elapsedSeconds)}`;
    let convId = selectedChatIdRef.current?.startsWith("new_") ? "" : selectedChatIdRef.current;
    if (!convId) {
      const found = conversationsRef.current.find((c) => getConversationPeerId(c) === session.peerId);
      if (found && !found.id.startsWith("new_")) convId = found.id;
    }
    stompClientRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify({ conversationId: convId || "", receiverId: session.peerId, content: logText, messageType: "text" }),
    });
  };

  const createPeerConnection = (targetId: string, callId: string, callMode: CallMode) => {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = (e) => {
      if (e.candidate) sendCallSignal("ice-candidate", { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex }, targetId, callId, callMode);
    };
    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        remoteStreamRef.current = e.streams[0];
        if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = e.streams[0]; remoteVideoRef.current.play().catch(() => {}); }
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); }
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") { toast.error("Kết nối thất bại"); closeCall(true); }
    };
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    peerConnectionRef.current = pc;
    return pc;
  };

  const replaceLocalVideoTrack = (track: MediaStreamTrack) => {
    const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video");
    sender?.replaceTrack(track).catch(() => toast.error("Không thể đổi nguồn video."));

    const audioTracks = localStreamRef.current?.getAudioTracks() || cameraStreamRef.current?.getAudioTracks() || [];
    localStreamRef.current?.getVideoTracks().forEach((oldTrack) => {
      if (oldTrack.id !== track.id) oldTrack.stop();
    });
    localStreamRef.current = new MediaStream([...audioTracks, track]);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = new MediaStream([track]);
      localVideoRef.current.play().catch(() => {});
    }
  };

  const stopScreenShare = async () => {
    const s = callSessionRef.current;
    if (!s || s.mode !== "video" || !s.isScreenSharing) return;
    screenStreamRef.current?.getVideoTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStreamRef.current = null;
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: s.cameraFacing }, audio: false });
      cameraStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
      cameraStreamRef.current = cameraStream;
      const [cameraTrack] = cameraStream.getVideoTracks();
      if (cameraTrack) replaceLocalVideoTrack(cameraTrack);
      setCallSession((prev) => prev ? { ...prev, isScreenSharing: false, isCameraOff: false } : prev);
    } catch {
      toast.error("Không thể bật lại camera.");
      setCallSession((prev) => prev ? { ...prev, isScreenSharing: false, isCameraOff: true } : prev);
    }
  };

  const closeCall = (isLocal = true, isReject = false) => {
    if (acceptCallTimeoutRef.current) clearTimeout(acceptCallTimeoutRef.current);
    const s = callSessionRef.current;
    if (s && isLocal) {
      if (isReject) { logCallStatusToChat(s, "rejected"); sendCallSignal("reject", null, s.peerId, s.id, s.mode); }
      else if (s.status === "incoming") { logCallStatusToChat(s, "rejected"); sendCallSignal("reject", null, s.peerId, s.id, s.mode); }
      else { logCallStatusToChat(s, s.elapsedSeconds === 0 ? "missed" : "ended"); sendCallSignal("end", null, s.peerId, s.id, s.mode); }
    }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    remoteStreamRef.current = null; incomingOfferRef.current = null; iceCandidateQueueRef.current = [];
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach((t) => t.stop()); cameraStreamRef.current = null; }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach((t) => t.stop()); screenStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallSession(null);
  };

  const getCallMediaStream = async (mode: CallMode) => {
    if (mode === "audio") return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
    } catch {
      const audioOnly = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      toast.warning("Không mở được camera trên máy này, cuộc gọi vẫn tiếp tục bằng micro.");
      return audioOnly;
    }
  };

  const startCall = async (mode: CallMode) => {
    if (!selectedChat) { toast.error("Hãy chọn một cuộc trò chuyện trước."); return; }
    if (selectedChat.status === "pending") { toast.error("Không thể gọi khi hội thoại đang chờ phê duyệt."); return; }
    closeCall(false);
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const targetId = getConversationPeerId(selectedChat);
    const newSession: CallSession = { id: callId, mode, status: "connecting", startedAt: null, elapsedSeconds: 0, isMuted: false, isCameraOff: mode === "audio", isScreenSharing: false, cameraFacing: "user", isSpeakerOn: true, peerId: targetId, peerName: selectedChat.name, peerAvatar: selectedChatAvatar, hasMediaPermission: true, error: null };
    callSessionRef.current = newSession; setCallSession(newSession);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt không hỗ trợ media devices.");
      const stream = await getCallMediaStream(mode);
      localStreamRef.current = stream;
      if (mode === "video" && stream.getVideoTracks().length > 0) cameraStreamRef.current = stream.clone();
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play().catch(() => {}); }
      const pc = createPeerConnection(targetId, callId, mode);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      sendCallSignal("start", null, targetId, callId, mode);
      sendCallSignal("offer", { type: offer.type, sdp: offer.sdp }, targetId, callId, mode);
    } catch (err: any) {
      toast.error("Không thể truy cập micro/camera.");
      closeCall(true);
    }
  };

  const acceptCall = async () => {
    const s = callSessionRef.current; if (!s) return;
    try {
      const stream = await getCallMediaStream(s.mode);
      localStreamRef.current = stream;
      if (s.mode === "video" && stream.getVideoTracks().length > 0) cameraStreamRef.current = stream.clone();
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play().catch(() => {}); }
      const pc = createPeerConnection(s.peerId, s.id, s.mode);
      const next = { ...s, status: "active" as CallStatus, startedAt: Date.now() };
      callSessionRef.current = next; setCallSession(next);
      sendCallSignal("accept", null, s.peerId, s.id, s.mode);
      if (incomingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
        incomingOfferRef.current = null;
        for (const c of iceCandidateQueueRef.current) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        iceCandidateQueueRef.current = [];
        const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        sendCallSignal("answer", { type: answer.type, sdp: answer.sdp }, s.peerId, s.id, s.mode);
      }
    } catch (err: any) { toast.error(`Lỗi thiết bị: ${err.message}`); closeCall(true, true); }
  };

  const rejectCall = () => closeCall(true, true);
  const toggleMute = () => setCallSession((prev) => { if (!prev) return prev; const m = !prev.isMuted; localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !m)); return { ...prev, isMuted: m }; });
  const toggleCamera = () => setCallSession((prev) => { if (!prev || prev.mode !== "video") return prev; const c = !prev.isCameraOff; localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !c)); return { ...prev, isCameraOff: c }; });
  const toggleScreenShare = async () => {
    const s = callSessionRef.current;
    if (!s || s.mode !== "video" || s.status === "incoming") return;
    if (s.isScreenSharing) {
      await stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Trình duyệt không hỗ trợ chia sẻ màn hình.");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
      const [screenTrack] = screenStream.getVideoTracks();
      if (!screenTrack) throw new Error("Không có màn hình được chọn.");
      screenTrack.onended = () => {
        if (callSessionRef.current?.isScreenSharing) void stopScreenShare();
      };
      replaceLocalVideoTrack(screenTrack);
      setCallSession((prev) => prev ? { ...prev, isScreenSharing: true, isCameraOff: false } : prev);
    } catch (error: any) {
      toast.error(error?.message || "Không thể chia sẻ màn hình.");
    }
  };
  const switchCamera = async () => {
    const s = callSessionRef.current;
    if (!s || s.mode !== "video" || s.isScreenSharing) return;
    const nextFacing = s.cameraFacing === "user" ? "environment" : "user";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false });
      cameraStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;
      const [track] = stream.getVideoTracks();
      if (!track) throw new Error("Không tìm thấy camera.");
      replaceLocalVideoTrack(track);
      setCallSession((prev) => prev ? { ...prev, cameraFacing: nextFacing, isCameraOff: false } : prev);
    } catch {
      toast.error("Thiết bị không có camera trước/sau để đổi.");
    }
  };
  const toggleSpeaker = () => setCallSession((prev) => (prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : prev));

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!stompClientRef.current?.connected) { toast.error("Kết nối chưa sẵn sàng."); return; }
    setShowReactionPicker(null);
    stompClientRef.current.publish({ destination: "/app/chat.react", body: JSON.stringify({ messageId, emoji }) });
  };

  // ==================== WEBSOCKET ====================
  useEffect(() => {
    if (!currentUserId) return;
    const token = localStorage_service.getAuthToken();
    if (!token) return;
    if (stompClientRef.current?.active) stompClientRef.current.deactivate();

    const client = new Client({
      webSocketFactory: () => createSockJsConnection(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
      onStompError: (f) => console.error("[STOMP Error]", f),
      onConnect: () => {
        const safe = (data: any) => {
          if (!data) return null;
          if (typeof data === "object") return data;
          const s = String(data).trim();
          if (!s || s === "undefined" || s === "null") return null;
          try { return JSON.parse(s); } catch { return null; }
        };

        const subscribeUserQueue = (queue: string, handler: (frame: any) => void) => {
          [`/user/queue/${queue}`, `/user/${currentUserId}/queue/${queue}`].forEach((destination) => {
            client.subscribe(destination, handler);
          });
        };

        subscribeUserQueue("messages", (frame) => {
  const msg = safe(frame.body); 
  if (!msg) return;
  
  const messageKey = toId(msg.id) || `${toId(msg.conversationId)}:${toId(msg.senderId)}:${toId(msg.createdAt)}:${toId(msg.content)}`;
  if (messageKey && realtimeMessageIdsRef.current.has(messageKey)) return;
  if (messageKey) {
    realtimeMessageIdsRef.current.add(messageKey);
    if (realtimeMessageIdsRef.current.size > 300) {
      realtimeMessageIdsRef.current = new Set(Array.from(realtimeMessageIdsRef.current).slice(-150));
    }
  }
  
  const convId = toId(msg.conversationId);
  const senderId = toId(msg.senderId);
  const receiverId = toId(msg.receiverId);
  const peerId = getEventPeerId(senderId, receiverId);
  
  // Cập nhật danh sách hội thoại
  setConversations((prev) => {
    const updated = [...prev];
    
    // Bước 1: Tìm bằng conversationId (ƯU TIÊN SỐ 1)
    let idx = updated.findIndex((c) => convId && toId(c.id) === convId);
    
    // Bước 2: Nếu không tìm thấy, tìm theo peerId (cho chat 1-1)
    if (idx === -1) {
      idx = updated.findIndex((c) => {
        if (!toId(c.id).startsWith("new_")) return false;
        const cPeerId = getConversationPeerId(c);
        if (!c.type || c.type === "direct") {
          return (senderId === currentUserId && cPeerId === receiverId) || 
                 (receiverId === currentUserId && cPeerId === senderId);
        }
        return c.type === "group" && convId && toId(c.id) === convId;
      });
    }
    
    if (idx > -1) {
      const conv = { ...updated[idx] };
      conv.lastMessage = msg.content;
      conv.time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      
      // Chỉ tăng unread nếu:
      // 1. Tin nhắn KHÔNG phải của mình
      // 2. Hội thoại này KHÔNG đang được chọn
      if (senderId !== currentUserId && toId(selectedChatIdRef.current) !== toId(conv.id)) {
        conv.unread = (conv.unread || 0) + 1;
      }
      
      // Cập nhật ID nếu hội thoại đang ở dạng "new_"
      if (toId(conv.id).startsWith("new_") && convId) {
        const prevPeerId = getConversationPeerId(conv);
        conv.id = convId; 
        conv.targetUserId = conv.targetUserId || prevPeerId || peerId;
        if (selectedChatIdRef.current === `new_${prevPeerId}` || selectedChatIdRef.current === `new_${peerId}`) {
          setSelectedChatId(convId);
        }
      }
      
      updated.splice(idx, 1); 
      updated.unshift(conv); 
      return dedupConversations(updated);
    }
    
    void loadChatsAndFriends({ force: true, silent: true }); 
    return updated;
  });
  
  // ✅ CHỈ HIỂN THỊ TIN NHẮN NẾU ĐÚNG HỘI THOẠI ĐANG MỞ
  // So sánh trực tiếp conversationId với selectedChatId
  const selectedId = toId(selectedChatIdRef.current);
  const messageBelongsToSelectedChat = convId && selectedId && toId(convId) === selectedId;
  
  if (messageBelongsToSelectedChat) {
    setConversationMessages(convId, (prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      const clean = prev.filter((m) => !(m.id.startsWith("temp_") && m.text === msg.content));
      return [...clean, {
        id: msg.id,
        senderId: senderId === currentUserId ? "me" : senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        text: msg.content,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        replyToMessageId: msg.replyToMessageId,
        attachmentUrl: msg.attachmentUrl,
        attachmentName: msg.attachmentName,
        attachmentSize: msg.attachmentSize,
        messageType: msg.messageType,
      }];
    });
  }
});

        subscribeUserQueue("message-updates", (frame) => {
          const msg = safe(frame.body); if (!msg) return;
          if (toId(msg.conversationId) !== toId(messagesConversationIdRef.current)) return;
          setConversationMessages(toId(msg.conversationId), (prev) => prev.map((item) => {
            if (toId(item.id) !== toId(msg.id)) return item;
            return {
              ...item,
              text: msg.isDeleted ? "Tin nhắn đã được thu hồi" : (msg.content || msg.text || item.text),
              isDeleted: Boolean(msg.isDeleted),
              isEdited: Boolean(msg.editedAt),
              time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.time,
            };
          }));
          setConversations((prev) => prev.map((c) => (
            toId(c.id) === toId(msg.conversationId)
              ? { ...c, lastMessage: msg.isDeleted ? "Tin nhắn đã được thu hồi" : (msg.content || c.lastMessage) }
              : c
          )));
        });

        subscribeUserQueue("typing", (frame) => {
          const ev = safe(frame.body); if (!ev) return;
          const isTyping = ev.isTyping === true || ev.typing === true;
          const convKey = toId(ev.conversationId), peerId = getEventPeerId(ev.senderId, ev.receiverId);
          setTypingUsers((prev) => { const next = { ...prev }; if (convKey) next[convKey] = isTyping; if (peerId) next[`new_${peerId}`] = isTyping; return next; });
        });

        subscribeUserQueue("call", (frame) => {
          const ev = safe(frame.body); if (!ev) return;
          const { type, callId, callType, senderId, signalData } = ev;
          const parsed = safe(signalData);
          if (type === "start") {
            const caller = conversationsRef.current.find((c) => getConversationPeerId(c) === toId(senderId));
            const incoming: CallSession = { id: callId, mode: callType, status: "incoming", startedAt: null, elapsedSeconds: 0, isMuted: false, isCameraOff: callType === "audio", isScreenSharing: false, cameraFacing: "user", isSpeakerOn: true, peerId: toId(senderId), peerName: caller?.name || "Người gọi", peerAvatar: caller?.avatar || getAvatarUrl("", senderId), hasMediaPermission: true, error: null };
            callSessionRef.current = incoming; setCallSession(incoming);
          } else if (type === "offer" && parsed) {
            incomingOfferRef.current = parsed;
            const pc = peerConnectionRef.current;
            if (pc && !pc.remoteDescription) {
              pc.setRemoteDescription(new RTCSessionDescription(parsed)).then(() => {
                iceCandidateQueueRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
                iceCandidateQueueRef.current = [];
                return pc.createAnswer();
              }).then((ans) => pc.setLocalDescription(ans)).then(() => {
                if (pc.localDescription) sendCallSignal("answer", { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, toId(senderId), callId, callType);
              }).catch(console.error);
            }
          } else if (type === "answer" && parsed && peerConnectionRef.current) {
            if (acceptCallTimeoutRef.current) clearTimeout(acceptCallTimeoutRef.current);
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(parsed)).then(() => {
              iceCandidateQueueRef.current.forEach((c) => peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
              iceCandidateQueueRef.current = [];
            }).catch(console.error);
            const next = callSessionRef.current ? { ...callSessionRef.current, status: "active" as CallStatus, startedAt: Date.now() } : null;
            if (next) { callSessionRef.current = next; setCallSession(next); }
          } else if ((type === "ice-candidate" || type === "ice") && parsed) {
            if (peerConnectionRef.current?.remoteDescription) peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(parsed)).catch(() => {});
            else iceCandidateQueueRef.current.push(parsed);
          } else if (type === "reject" || type === "end") {
            if (callSessionRef.current) toast.info(type === "reject" ? "Đã từ chối cuộc gọi" : "Cuộc gọi đã kết thúc");
            closeCall(false);
          }
        });

        subscribeUserQueue("reactions", (frame) => {
          const reaction = safe(frame.body); if (!reaction) return;
          const currentConversationId = messagesConversationIdRef.current;
          if (currentConversationId && currentConversationId !== toId(selectedChatIdRef.current)) return;
          setConversationMessages(currentConversationId, (prev) => prev.map((msg) => {
            if (msg.id !== reaction.messageId) return msg;
            const updated = { ...(msg.userReactions || {}) };
            if (reaction.action === "added") updated[reaction.emoji] = true;
            else delete updated[reaction.emoji];
            return { ...msg, reactions: reaction.reactions, userReactions: updated };
          }));
        });

        subscribeUserQueue("online-status", (frame) => {
          const status = safe(frame.body); if (!status) return;
          const userId = toId(status.userId);
          if (!userId) return;
          setConversations((prev) => prev.map((c) => getConversationPeerId(c) === userId ? { ...c, isOnline: Boolean(status.isOnline) } : c));
          setSearchResults((prev) => prev.map((u) => toId(u.id) === userId ? { ...u, isOnline: Boolean(status.isOnline) } : u));
        });

        subscribeUserQueue("errors", (frame) => {
          const message = safe(frame.body) || frame.body;
          if (message) toast.error(String(message));
        });

        client.publish({ destination: "/app/presence.ping", body: "{}" });
        const presenceTimer = window.setInterval(() => {
          if (client.connected) client.publish({ destination: "/app/presence.ping", body: "{}" });
        }, 60000);
        (client as any).__presenceTimer = presenceTimer;
      },
    });

    client.activate();
    stompClientRef.current = client;
    return () => {
      const presenceTimer = (client as any).__presenceTimer;
      if (presenceTimer) window.clearInterval(presenceTimer);
      if (client.active) client.deactivate();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const onIncomingCall = (event: Event) => {
      applyIncomingCallEvent((event as CustomEvent).detail);
    };
    window.addEventListener(INCOMING_CALL_EVENT, onIncomingCall);

    const pendingCall = readPendingCall<any>();
    if (pendingCall) {
      applyIncomingCallEvent(pendingCall);
      clearPendingCall();
    }

    return () => window.removeEventListener(INCOMING_CALL_EVENT, onIncomingCall);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    loadChatsAndFriends();
    const refreshTimer = window.setInterval(() => loadChatsAndFriends({ silent: true }), 60000);
    return () => window.clearInterval(refreshTimer);
  }, [currentUserId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get("user");
    if (!userId || isLoadingChats) return;

    const existing = conversations.find((chat) => getConversationPeerId(chat) === userId || chat.id === userId);
    if (existing) {
      setConversationMessages(existing.id, []);
      setSelectedChatId(existing.id);
      return;
    }

    let cancelled = false;
    const openNewConversation = async () => {
      try {
        const user = await api.getUser(userId);
        if (cancelled || !user?.id) return;
        const item: SearchUserItem = {
          id: toId(user.id),
          name: user.name || "Người dùng",
          avatar: user.avatar,
          isOnline: Boolean(user.isOnline),
        };
        setSearchResults((prev) => prev.some((u) => toId(u.id) === toId(item.id)) ? prev : [item, ...prev]);
        const newConversationId = `new_${toId(item.id)}`;
        setConversationMessages(newConversationId, []);
        setSelectedChatId(newConversationId);
      } catch {
        toast.error("Không thể mở hội thoại với người dùng này.");
      }
    };
    openNewConversation();
    return () => { cancelled = true; };
  }, [location.search, isLoadingChats, conversations]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  useEffect(() => {
    if (!callSession || callSession.status !== "active" || !callSession.startedAt) return;
    const timer = setInterval(() => {
      setCallSession((prev) => prev?.startedAt ? { ...prev, elapsedSeconds: Math.floor((Date.now() - prev.startedAt) / 1000) } : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [callSession?.status, callSession?.startedAt]);

  useEffect(() => { return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); closeCall(false); }; }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try { const r = await api.searchUsersToChat(searchQuery); setSearchResults(r || []); }
      catch { } finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedChatId) return;
    const conversationId = selectedChatId;
    if (conversationId.startsWith("new_")) { setConversationMessages(conversationId, []); return; }
    if (!currentUserId) return;
    let cancelled = false;
    setConversationMessages(conversationId, []);
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await api.request("GET", `/api/chat/messages/${conversationId}`);
        if (cancelled || selectedChatIdRef.current !== conversationId) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const nextMessages = list.map((m: any) => ({
          id: toId(m.id) || Math.random().toString(),
          senderId: toId(m.senderId) === currentUserId ? "me" : toId(m.senderId),
          senderName: m.senderName,
          senderAvatar: m.senderAvatar,
          text: m.isDeleted ? "Tin nhắn đã được thu hồi" : (m.content || m.text || "Tin nhắn không hợp lệ."),
          time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isDeleted: Boolean(m.isDeleted),
          isEdited: Boolean(m.editedAt),
          replyToMessageId: m.replyToMessageId,
          attachmentUrl: m.attachmentUrl,
          attachmentName: m.attachmentName,
          attachmentSize: m.attachmentSize,
          messageType: m.messageType,
          reactions: m.reactions || {}, userReactions: m.userReactions || {},
        }));
        setConversationMessages(conversationId, nextMessages);
        setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, unread: 0 } : c));
        void api.request("POST", `/api/chat/conversations/${conversationId}/read`).catch(() => {});
      } catch {
        if (!cancelled && selectedChatIdRef.current === conversationId) {
          setConversationMessages(conversationId, []);
        }
      } finally {
        if (!cancelled && selectedChatIdRef.current === conversationId) {
          setIsLoadingMessages(false);
        }
      }
    };
    fetchMessages();
    return () => { cancelled = true; };
  }, [selectedChatId, currentUserId, selectedChat?.unread]);

  // ==================== SEND MESSAGE ====================
  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;
    const content = messageInput.trim(); setMessageInput("");
    const currentReply = replyingTo;
    setReplyingTo(null);
    const opt: MessageItem = { id: `temp_${Date.now()}`, senderId: "me", text: content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), replyToMessageId: currentReply?.id };
    setConversationMessages(selectedChat.id, (prev) => [...prev, opt]);
    setConversations((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((c) => c.id === selectedChat.id);
      if (idx > -1) { const conv = { ...updated[idx], lastMessage: `Bạn: ${content}`, time: opt.time }; updated.splice(idx, 1); updated.unshift(conv); }
      return dedupConversations(updated);
    });
    const payload = { conversationId: selectedChat.id.startsWith("new_") ? "" : selectedChat.id, receiverId: getConversationPeerId(selectedChat), content, messageType: "text", replyToMessageId: currentReply?.id };
    if (stompClientRef.current?.connected) stompClientRef.current.publish({ destination: "/app/chat.sendMessage", body: JSON.stringify(payload) });
    else { try { await api.request("POST", "/api/chat/messages", payload); } catch { toast.error("Không thể gửi tin nhắn."); } }
    if (stompClientRef.current?.connected) stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify({ ...payload, isTyping: false, typing: false }) });
  };

  const handleEditMessage = async (message: MessageItem) => {
    if (message.senderId !== "me" || message.isDeleted || message.id.startsWith("temp_")) return;
    const content = window.prompt("Sửa tin nhắn", message.text);
    if (content === null) return;
    const nextContent = content.trim();
    if (!nextContent) return;
    try {
      const res = await api.request("PUT", `/api/chat/messages/${encodeURIComponent(message.id)}`, { content: nextContent });
      const updated = res?.data || res || {};
      setConversationMessages(messagesConversationIdRef.current, (prev) => prev.map((item) => item.id === message.id ? { ...item, text: updated.content || nextContent, isEdited: true } : item));
    } catch (error: any) {
      toast.error(error?.message || "Không thể sửa tin nhắn.");
    }
  };

  const handleRecallMessage = async (message: MessageItem) => {
    if (message.senderId !== "me" || message.isDeleted || message.id.startsWith("temp_")) return;
    if (!window.confirm("Thu hồi tin nhắn này?")) return;
    try {
      await api.request("DELETE", `/api/chat/messages/${encodeURIComponent(message.id)}`);
      setConversationMessages(messagesConversationIdRef.current, (prev) => prev.map((item) => item.id === message.id ? { ...item, text: "Tin nhắn đã được thu hồi", isDeleted: true } : item));
    } catch (error: any) {
      toast.error(error?.message || "Không thể thu hồi tin nhắn.");
    }
  };

  const handleCopyMessage = async (message: MessageItem) => {
    try {
      await navigator.clipboard.writeText(message.text || message.attachmentUrl || "");
      toast.success("Đã copy tin nhắn.");
    } catch {
      toast.error("Không thể copy tin nhắn.");
    }
  };

  const sendAttachmentMessage = async (file: File) => {
    if (!selectedChat) return;
    setIsUploadingAttachment(true);
    try {
      const uploaded = await api.uploadFile(file);
      const isImage = String(uploaded.type || file.type).startsWith("image/");
      const payload = {
        conversationId: selectedChat.id.startsWith("new_") ? "" : selectedChat.id,
        receiverId: getConversationPeerId(selectedChat),
        content: isImage ? "Đã gửi một hình ảnh" : `Đã gửi tệp: ${uploaded.name || file.name}`,
        messageType: isImage ? "image" : "file",
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.name || file.name,
        attachmentSize: uploaded.size || file.size,
      };
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({ destination: "/app/chat.sendMessage", body: JSON.stringify(payload) });
      } else {
        await api.request("POST", "/api/chat/messages", payload);
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể gửi file.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void sendAttachmentMessage(file);
  };

  const handleChatBackgroundChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chọn ảnh làm nền hội thoại.");
      return;
    }
    try {
      const uploaded = await api.uploadFile(file);
      if (uploaded?.url) updateCustomChatBackground(uploaded.url);
    } catch (error: any) {
      toast.error(error?.message || "Không thể tải ảnh nền.");
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (stompClientRef.current?.connected && selectedChat) {
      const payload = { conversationId: selectedChat.id.startsWith("new_") ? "" : selectedChat.id, receiverId: getConversationPeerId(selectedChat), isTyping: true, typing: true };
      stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify(payload) });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stompClientRef.current?.connected && stompClientRef.current.publish({ destination: "/app/chat.typing", body: JSON.stringify({ ...payload, isTyping: false, typing: false }) });
      }, 2000);
    }
  };

  const handleComposerFocus = () => {
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: "end" }), 120);
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: "end" }), 360);
  };

  const openSelectedProfile = () => {
    const peerId = selectedChat ? getConversationPeerId(selectedChat) : "";
    if (!peerId) return;
    navigate(`/nguoi-dung/${peerId}`);
  };

  const handleCreateGroup = async () => {
    const memberIds = Array.from(new Set(groupMemberIds.filter(Boolean)));
    if (memberIds.length < 2) {
      toast.error("Chọn ít nhất 2 người để tạo nhóm.");
      return;
    }
    try {
      const res = await api.request("POST", "/api/chat/conversations", {
        type: "group",
        groupName: groupName.trim() || "Nhóm chat",
        memberIds,
      });
      const item = res?.data || res;
      const nextChat: ConversationItem = {
        id: toId(item.id),
        type: "group",
        name: item.groupName || groupName.trim() || "Nhóm chat",
        lastMessage: item.lastMessage || "Bắt đầu cuộc trò chuyện nhóm.",
        time: item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: 0,
        status: "accepted",
        memberCount: item.memberCount,
      };
      setConversations((prev) => dedupConversations([nextChat, ...prev]));
      setConversationMessages(nextChat.id, []);
      setSelectedChatId(nextChat.id);
      setShowCreateGroup(false);
      setGroupName("");
      setGroupMemberIds([]);
      toast.success("Đã tạo nhóm chat.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể tạo nhóm chat.");
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const updateVisualHeight = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const height = Math.round(window.visualViewport?.height || window.innerHeight);
        root.style.setProperty("--app-visual-height", `${height}px`);
      });
    };

    updateVisualHeight();

    window.visualViewport?.addEventListener("resize", updateVisualHeight);
    window.addEventListener("resize", updateVisualHeight);
    window.addEventListener("orientationchange", updateVisualHeight);

    return () => {
      window.cancelAnimationFrame(raf);
      root.style.removeProperty("--app-visual-height");
      window.visualViewport?.removeEventListener("resize", updateVisualHeight);
      window.removeEventListener("resize", updateVisualHeight);
      window.removeEventListener("orientationchange", updateVisualHeight);
    };
  }, []);

  // ==================== COMPUTED ====================
  const isSearchMode = searchQuery.trim().length > 0;
  const inboxConvs = conversations.filter((c) => c.status === "accepted");
  const pendingConvs = conversations.filter((c) => c.status === "pending");
  const totalUnread = inboxConvs.reduce((s, c) => s + (c.unread || 0), 0);

  const displayList: ConversationItem[] = isSearchMode
    ? searchResults.map((u) => ({ id: `new_${toId(u.id)}`, targetUserId: toId(u.id), name: u.name, avatar: u.avatar, lastMessage: "Nhắn để mở cuộc trò chuyện ngay.", time: "", unread: 0, isOnline: Boolean(u.isOnline), status: "accepted" }))
    : chatFilter === "all" ? conversations
    : chatFilter === "unread" ? conversations.filter((c) => (c.unread || 0) > 0)
    : chatFilter === "pending" ? pendingConvs
    : conversations;

  const selectedPeerId = selectedChat ? getConversationPeerId(selectedChat) : "";
  const isSelectedTyping = selectedChat ? Boolean(typingUsers[selectedChat.id] || (selectedPeerId && typingUsers[`new_${selectedPeerId}`])) : false;
  const selectedStatus = isSelectedTyping ? "Đang soạn tin nhắn..." : selectedChat?.isOnline ? "Đang hoạt động" : "Ngoại tuyến";

  // ==================== RENDER ====================
  return (
    <div
      className={`messages-shell${selectedChat ? " has-selected-chat" : ""}`}
      style={{ display: "flex", height: "100%", minHeight: 0, overflow: "hidden", background: "#f0f2f5", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ── CHAT LIST PANEL ── */}
      <div
        className="chat-list-panel"
        style={{
          width: 320, minWidth: 260, maxWidth: 360, background: "#fff",
          borderRight: "1px solid #f0f0f0",
          display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Tin nhắn</h1>
            <div style={{ display: "flex", gap: 6 }}>
              {/* Plus button - orange */}
              <button type="button" onClick={() => setShowCreateGroup(true)} style={{
                width: 34, height: 34, borderRadius: 10,
                border: "none", background: ORANGE, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                boxShadow: `0 2px 8px ${ORANGE}50`,
              }}>
                <Plus size={16} />
              </button>
              <button type="button" style={{
                width: 34, height: 34, borderRadius: 10,
                border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#b0b0b0",
              }}>
                <Bell size={16} />
              </button>
              <button type="button" style={{
                width: 34, height: 34, borderRadius: 10,
                border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#b0b0b0",
              }}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#b0b0b0" }} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", height: 38, borderRadius: 10,
                border: "1px solid #f0f0f0", paddingLeft: 36, paddingRight: 12,
                fontSize: 14, outline: "none", boxSizing: "border-box",
                background: "#f8f8f8", color: "#1a1a1a",
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[
              { label: "Tất cả", value: "all" },
              { label: `Chưa đọc${totalUnread > 0 ? ` (${totalUnread})` : ""}`, value: "unread" },
              { label: `Chờ (${pendingConvs.length})`, value: "pending" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setChatFilter(tab.value as any)}
                style={{
                  padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  background: chatFilter === tab.value ? ORANGE : "#f0f0f0",
                  color: chatFilter === tab.value ? "#fff" : "#888",
                  transition: "all 0.15s",
                  boxShadow: chatFilter === tab.value ? `0 2px 8px ${ORANGE}40` : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {isLoadingChats || isSearching ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32, color: ORANGE }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : displayList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "#b0b0b0" }}>
              <Inbox size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>
                {isSearchMode ? "Không tìm thấy kết quả" : chatFilter === "pending" ? "Không có tin nhắn chờ" : "Chưa có hội thoại nào"}
              </div>
            </div>
          ) : (
            displayList.map((chat) => {
              const isActive = selectedChat?.id === chat.id;
              const avatar = getAvatarUrl(chat.avatar, chat.targetUserId || chat.id);
              const isTyping = Boolean(typingUsers[chat.id]);
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => { setConversationMessages(chat.id, []); setSelectedChatId(chat.id); setShowInfo(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? ORANGE_LIGHT : "transparent",
                    transition: "background 0.15s", boxSizing: "border-box",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img src={avatar} alt={chat.name} style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover" }} />
                    {chat.isOnline && chat.status !== "pending" && (
                      <span style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid #fff" }} />
                    )}
                    {chat.status === "pending" && (
                      <span style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#f59e0b", border: "2px solid #fff" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{chat.name}</div>
                      <div style={{ fontSize: 11, color: "#b0b0b0", whiteSpace: "nowrap", marginLeft: 4 }}>{chat.time}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <div style={{ fontSize: 12, color: isTyping ? ORANGE : "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160, fontStyle: isTyping ? "italic" : "normal" }}>
                        {isTyping ? "Đang nhập..." : chat.status === "pending" ? "📨 Tin nhắn chờ phê duyệt" : (chat.lastMessage || "")}
                      </div>
                      {(chat.unread || 0) > 0 && (
                        <span style={{ background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "1px 7px", minWidth: 20, textAlign: "center", flexShrink: 0 }}>{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="chat-thread-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", minHeight: 0 }}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div style={{ height: 60, background: "#fff", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => { setConversationMessages(null, []); setSelectedChatId(null); }}
                className="mobile-back-btn"
                style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE }}
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{ position: "relative" }}>
                <img src={selectedChatAvatar} alt={selectedChat.name} style={{ width: 42, height: 42, borderRadius: 13, objectFit: "cover" }} />
                {selectedChat.isOnline && <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #fff" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedChat.name}</div>
                <div style={{ fontSize: 12, color: selectedChat.status === "pending" ? "#f59e0b" : isSelectedTyping ? ORANGE : "#22c55e" }}>
                  {selectedChat.status === "pending" ? "⏳ Chờ phê duyệt" : selectedStatus}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => startCall("audio")} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE }}><Phone size={16} /></button>
                <button type="button" onClick={() => startCall("video")} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE }}><Video size={16} /></button>
                <button type="button" onClick={() => setShowInfo((p) => !p)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #f0f0f0", background: showInfo ? ORANGE_LIGHT : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE }}><Info size={16} /></button>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              {/* Messages */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: selectedChatBackgroundValue }}>
                <div className="messages-scroll-area" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
                  {isLoadingMessages ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 32, color: ORANGE }}>
                      <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#b0b0b0", textAlign: "center", padding: 24 }}>
                      <img src={selectedChatAvatar} alt="" style={{ width: 72, height: 72, borderRadius: 22, objectFit: "cover", marginBottom: 8, border: `3px solid ${ORANGE_LIGHT}` }} />
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>{selectedChat.name}</div>
                      <div style={{ fontSize: 13, color: "#b0b0b0", maxWidth: 280 }}>Hãy nhắn tin trước để bắt đầu!</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 720, width: "100%", margin: "0 auto" }}>
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === "me";
                        const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId);
                        const isGroupChat = selectedChat?.type === "group";
                        const repliedMessage = msg.replyToMessageId ? messages.find((item) => item.id === msg.replyToMessageId) : null;
                        const previousSameSender = idx > 0 && messages[idx - 1]?.senderId === msg.senderId;
                        return (
                          <div key={msg.id}
                            style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8, position: "relative", marginTop: previousSameSender ? 1 : 7 }}
                            onMouseLeave={() => setShowReactionPicker(null)}>
                            {!isMe && (
                              <div style={{ width: 32, flexShrink: 0 }}>
                                {showAvatar ? <img src={selectedChatAvatar} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} /> : <div style={{ width: 32 }} />}
                              </div>
                            )}
                            <div className="message-bubble-group" style={{ maxWidth: "68%", position: "relative" }}>
                              {!isMe && isGroupChat && msg.senderName && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", margin: "0 0 3px 4px" }}>
                                  {msg.senderName}
                                </div>
                              )}
                              <div
                                style={{
                                  background: msg.isDeleted ? "#f8fafc" : isMe ? `linear-gradient(135deg, ${ORANGE}, ${ORANGE_MID})` : "#fff",
                                  color: msg.isDeleted ? "#94a3b8" : isMe ? "#fff" : "#1a1a1a",
                                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                  padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
                                  wordBreak: "break-word", cursor: msg.isDeleted ? "default" : "pointer",
                                  userSelect: "none",
                                  WebkitUserSelect: "none",
                                  touchAction: "manipulation",
                                  fontStyle: msg.isDeleted ? "italic" : "normal",
                                  boxShadow: isMe ? `0 2px 8px ${ORANGE}40` : "0 1px 4px rgba(0,0,0,0.06)",
                                }}
                                onMouseEnter={() => !msg.isDeleted && setShowReactionPicker(msg.id)}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  if (!msg.isDeleted) setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                                }}
                              >
                                {repliedMessage && (
                                  <div style={{ borderLeft: `3px solid ${isMe ? "#fff" : ORANGE}`, background: isMe ? "rgba(255,255,255,0.16)" : "#f8fafc", borderRadius: 8, padding: "5px 7px", marginBottom: 7, fontSize: 12 }}>
                                    <div style={{ fontWeight: 700 }}>{repliedMessage.senderId === "me" ? "Bạn" : (repliedMessage.senderName || selectedChat.name)}</div>
                                    <div style={{ opacity: 0.78, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{repliedMessage.text}</div>
                                  </div>
                                )}
                                {msg.attachmentUrl && !msg.isDeleted && (
                                  String(msg.messageType).toLowerCase() === "image" ? (
                                    <img src={normalizeAvatarUrl(msg.attachmentUrl, msg.id)} alt={msg.attachmentName || ""} style={{ display: "block", maxWidth: 260, maxHeight: 260, borderRadius: 12, objectFit: "cover", marginBottom: msg.text ? 8 : 0 }} />
                                  ) : (
                                    <a href={normalizeAvatarUrl(msg.attachmentUrl, msg.id)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "inherit", textDecoration: "none", marginBottom: msg.text ? 8 : 0 }}>
                                      <FileText size={18} />
                                      <span style={{ fontWeight: 700 }}>{msg.attachmentName || "Tệp đính kèm"}</span>
                                    </a>
                                  )
                                )}
                                {msg.text}
                              </div>
                              <div style={{ fontSize: 11, color: "#b0b0b0", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                                {msg.time}{msg.isEdited && !msg.isDeleted ? " · đã sửa" : ""}
                              </div>

                              {!msg.isDeleted && (
                                <div className="message-action-row" data-side={isMe ? "right" : "left"} data-active={activeMessageMenu === msg.id || showReactionPicker === msg.id ? "true" : "false"} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 6 }}>
                                  <button type="button" title="Copy" onClick={() => handleCopyMessage(msg)} style={{ width: 26, height: 26, borderRadius: 13, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Copy size={13} /></button>
                                  <button type="button" title="Trả lời" onClick={() => setReplyingTo(msg)} style={{ width: 26, height: 26, borderRadius: 13, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Reply size={13} /></button>
                                  <button type="button" title="React" onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)} style={{ width: 26, height: 26, borderRadius: 13, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Smile size={13} /></button>
                                  {isMe && !msg.id.startsWith("temp_") && (
                                    <button type="button" title="Thêm" onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)} style={{ width: 26, height: 26, borderRadius: 13, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={14} /></button>
                                  )}
                                </div>
                              )}

                              {activeMessageMenu === msg.id && isMe && !msg.isDeleted && !msg.id.startsWith("temp_") && (
                                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 25, minWidth: 132, overflow: "hidden", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 12px 28px rgba(15,23,42,0.16)" }}>
                                  <button type="button" onClick={() => { setActiveMessageMenu(null); handleEditMessage(msg); }} style={{ width: "100%", border: 0, background: "#fff", padding: "9px 11px", display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13 }}><Pencil size={14} /> Sửa</button>
                                </div>
                              )}

                              {false && isMe && !msg.isDeleted && !msg.id.startsWith("temp_") && (
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4, fontSize: 11 }}>
                                  <button type="button" onClick={() => handleEditMessage(msg)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", padding: 0 }}>Sửa</button>
                                  <button type="button" onClick={() => handleRecallMessage(msg)} style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 0 }}>Thu hồi</button>
                                </div>
                              )}

                              {showReactionPicker === msg.id && !msg.isDeleted && (
                                <div style={{ position: "absolute", bottom: "100%", [isMe ? "right" : "left"]: 0, background: "#fff", borderRadius: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid #f0f0f0", padding: "6px 10px", display: "flex", gap: 4, zIndex: 20, marginBottom: 4 }}>
                                  {SAFE_REACTION_EMOJIS.map((emoji) => (
                                    <button key={emoji} type="button" onClick={() => handleToggleReaction(msg.id, emoji)}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 2, borderRadius: 8, transition: "transform 0.1s" }}
                                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                    >{emoji}</button>
                                  ))}
                                </div>
                              )}

                              {!msg.isDeleted && msg.reactions && Object.entries(msg.reactions).some(([, c]) => c > 0) && (
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                  {Object.entries(msg.reactions).map(([emoji, count]) => count > 0 && (
                                    <button key={emoji} type="button" onClick={() => handleToggleReaction(msg.id, emoji)}
                                      style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 12, border: `1px solid ${msg.userReactions?.[emoji] ? ORANGE : "#f0f0f0"}`, background: msg.userReactions?.[emoji] ? ORANGE_LIGHT : "#fff", cursor: "pointer", fontSize: 12 }}>
                                      <span>{emoji}</span><span style={{ fontWeight: 600, color: ORANGE }}>{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {isSelectedTyping && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                          <img src={selectedChatAvatar} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
                          <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                            {[0, 0.15, 0.3].map((delay, i) => (
                              <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#b0b0b0", display: "block", animation: `bounce 1s ${delay}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} style={{ height: 8 }} />
                    </div>
                  )}
                </div>

                {/* Input area */}
                {selectedChat.status === "pending" ? (
                  <div style={{ padding: 16, background: "#fff", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: 16, textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                        <ShieldAlert size={18} color="#f59e0b" />
                        <span style={{ fontWeight: 600, color: "#92400e", fontSize: 14 }}>Tin nhắn chờ phê duyệt</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#78350f", marginBottom: 12, lineHeight: 1.5 }}>
                        <strong>{selectedChat.name}</strong> muốn nhắn tin với bạn.
                      </p>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button type="button" onClick={handleRejectRequest}
                          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                          ✕ Từ chối
                        </button>
                        <button type="button" onClick={handleAcceptRequest} disabled={isAcceptingRequest}
                          style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: ORANGE, color: "#fff", cursor: isAcceptingRequest ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: isAcceptingRequest ? 0.7 : 1, boxShadow: `0 2px 8px ${ORANGE}50` }}>
                          {isAcceptingRequest ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                          Chấp nhận
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="message-composer" style={{ padding: "10px 14px", background: "#fff", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
                    {replyingTo && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, padding: "8px 10px", borderRadius: 12, background: ORANGE_LIGHT, color: "#334155" }}>
                        <div style={{ minWidth: 0, fontSize: 12 }}>
                          <div style={{ fontWeight: 800, color: ORANGE }}>Đang trả lời {replyingTo.senderId === "me" ? "Bạn" : (replyingTo.senderName || selectedChat.name)}</div>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyingTo.text}</div>
                        </div>
                        <button type="button" onClick={() => setReplyingTo(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}><X size={16} /></button>
                      </div>
                    )}
                    <input ref={attachmentInputRef} type="file" className="hidden" onChange={handleAttachmentChange} />
                    <form className="message-composer-form" onSubmit={handleSendMessage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={isUploadingAttachment} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #f0f0f0", background: "#f8f8f8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE, flexShrink: 0 }}>
                        {isUploadingAttachment ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={17} />}
                      </button>
                      <button type="button" title="Live" onClick={() => startCall("video")} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #fed7aa", background: "#fff7ed", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: ORANGE, flexShrink: 0 }}><Video size={17} /></button>
                      <div className="message-composer-input" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", background: "#f8f8f8", borderRadius: 20, border: "1px solid #f0f0f0", padding: "0 12px" }}>
                        <input
                          type="text"
                          value={messageInput}
                          onChange={handleInputChange}
                          onFocus={handleComposerFocus}
                          placeholder="Nhập tin nhắn..."
                          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 16, outline: "none", height: 42, color: "#1a1a1a" }}
                        />
                        <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#b0b0b0", display: "flex", alignItems: "center" }}><Smile size={17} /></button>
                      </div>
                      {messageInput.trim() ? (
                        <button type="submit" style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: ORANGE, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px ${ORANGE}50` }}>
                          <Send size={17} />
                        </button>
                      ) : (
                        <button type="button" style={{ width: 42, height: 42, borderRadius: 12, border: "1px solid #f0f0f0", background: "#fff", color: ORANGE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ThumbsUp size={17} />
                        </button>
                      )}
                    </form>
                  </div>
                )}
              </div>

              {/* ── INFO PANEL ── */}
              {showInfo && (
                <div className="chat-info-panel" style={{ width: 272, minWidth: 250, borderLeft: "1px solid #f0f0f0", background: "#fff", display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
                  <div style={{ padding: "14px 14px 0", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>Thông tin hội thoại</span>
                      <button type="button" onClick={() => setShowInfo(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#b0b0b0" }}><X size={14} /></button>
                    </div>
                    <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
                      {[{ label: "Thông tin", value: "info" }, { label: "Đoạn chat", value: "chat" }].map((tab) => (
                        <button key={tab.value} type="button" onClick={() => setInfoTab(tab.value as any)}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: infoTab === tab.value ? "#fff" : "transparent", color: infoTab === tab.value ? ORANGE : "#9ca3af", boxShadow: infoTab === tab.value ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}
                        >{tab.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                    {infoTab === "info" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ background: `linear-gradient(135deg, ${ORANGE_LIGHT}, #fff8f5)`, borderRadius: 18, padding: 18, textAlign: "center" }}>
                          <img src={selectedChatAvatar} alt={selectedChat.name} style={{ width: 64, height: 64, borderRadius: 20, objectFit: "cover", border: "3px solid #fff", boxShadow: `0 4px 16px ${ORANGE}30` }} />
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginTop: 10 }}>{selectedChat.name}</div>
                          <div style={{ fontSize: 12, color: ORANGE, marginTop: 4 }}>{selectedChat.isOnline ? "🟢 Đang hoạt động" : "⭕ Ngoại tuyến"}</div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[
                            { label: "Tin nhắn", value: messages.length },
                            { label: "Trạng thái", value: selectedChat.status === "pending" ? "Chờ" : "Kết nối" },
                          ].map((stat) => (
                            <div key={stat.label} style={{ background: "#f8f8f8", borderRadius: 12, padding: "10px 12px" }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: ORANGE }}>{stat.value}</div>
                              <div style={{ fontSize: 11, color: "#b0b0b0", marginTop: 2 }}>{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Nền hội thoại</div>
                          <input ref={chatBackgroundInputRef} type="file" accept="image/*" className="hidden" onChange={handleChatBackgroundChange} />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                            {CHAT_BACKGROUNDS.map((bg) => (
                              <button
                                key={bg.id}
                                type="button"
                                title={bg.label}
                                onClick={() => updateChatBackground(bg.id)}
                                style={{
                                  height: 42,
                                  borderRadius: 12,
                                  border: chatBackgroundId === bg.id ? `2px solid ${ORANGE}` : "1px solid #e5e7eb",
                                  background: bg.value,
                                  cursor: "pointer",
                                  boxShadow: chatBackgroundId === bg.id ? `0 0 0 3px ${ORANGE_LIGHT}` : "none",
                                }}
                              />
                            ))}
                          </div>
                          <button type="button" onClick={() => chatBackgroundInputRef.current?.click()} style={{ marginTop: 8, width: "100%", height: 34, borderRadius: 10, border: "1px solid #fed7aa", background: "#fff7ed", color: ORANGE, cursor: "pointer", fontSize: 12, fontWeight: 800 }}>
                            Tải ảnh nền lên
                          </button>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Hành động nhanh</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {[
                              { icon: Phone, label: "Gọi thoại", onClick: () => startCall("audio") },
                              { icon: Video, label: "Video call", onClick: () => startCall("video") },
                              { icon: UserIcon, label: "Xem trang cá nhân", onClick: openSelectedProfile },
                              { icon: Archive, label: "Lưu trữ hội thoại", onClick: () => {} },
                            ].map((action) => (
                              <button key={action.label} type="button" onClick={action.onClick}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", transition: "all 0.15s", textAlign: "left" }}>
                                <action.icon size={15} color={ORANGE} />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedChat.status === "pending" && (
                          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Tin nhắn chờ</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" onClick={handleRejectRequest} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Từ chối</button>
                              <button type="button" onClick={handleAcceptRequest} disabled={isAcceptingRequest} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                {isAcceptingRequest ? <Loader2 size={13} /> : <Check size={13} />} Chấp nhận
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>Bảo mật</div>
                          <button type="button" style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                            Chặn người dùng
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Tin nhắn gần đây</div>
                        {messages.length === 0 ? (
                          <div style={{ textAlign: "center", padding: 24, color: "#b0b0b0", fontSize: 13 }}>Chưa có tin nhắn nào</div>
                        ) : [...messages].reverse().slice(0, 20).map((msg) => {
                          const isMe = msg.senderId === "me";
                          return (
                            <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <img src={isMe ? getAvatarUrl(currentUser?.avatar, currentUserId) : getAvatarUrl(msg.senderAvatar || selectedChat.avatar, msg.senderId)} alt="" style={{ width: 26, height: 26, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: "#b0b0b0", marginBottom: 2 }}>{isMe ? "Bạn" : (msg.senderName || selectedChat.name)} · {msg.time}</div>
                                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.4, wordBreak: "break-word" }}>{msg.text}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#b0b0b0" }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: ORANGE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={32} color={ORANGE} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#374151" }}>Chọn cuộc trò chuyện</div>
            <div style={{ fontSize: 13, color: "#b0b0b0" }}>Chọn một hội thoại bên trái để bắt đầu</div>
          </div>
        )}
      </div>

      {/* ── CALL MODAL ── */}
      {callSession && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg,#1a0f0a 0%,#0f0806 100%)", borderRadius: 28, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${ORANGE}25`, padding: "5px 12px", borderRadius: 20 }}>
                  {callSession.mode === "video" ? <Camera size={13} color={ORANGE_MID} /> : <Phone size={13} color={ORANGE_MID} />}
                  <span style={{ fontSize: 11, color: ORANGE_MID, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{callSession.mode === "video" ? "Video call" : "Audio call"}</span>
                </div>
                <button type="button" onClick={() => closeCall(true)} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><X size={17} /></button>
              </div>

              <div style={{ textAlign: "center", marginBottom: 26 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  {callSession.status === "active" && <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: `${ORANGE}30`, animation: "pulse 2s infinite" }} />}
                  <img src={callSession.peerAvatar} alt={callSession.peerName} style={{ width: 90, height: 90, borderRadius: 26, objectFit: "cover", border: "3px solid rgba(255,255,255,0.15)", position: "relative" }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 12 }}>{callSession.peerName}</div>
                <div style={{ fontSize: 13, color: ORANGE_MID, marginTop: 5 }}>
                  {callSession.status === "incoming" ? "Đang gọi đến..." : callSession.status === "connecting" ? "Đang kết nối..." : `Đang gọi ${formatCallDuration(callSession.elapsedSeconds)}`}
                </div>
              </div>

              {callSession.mode === "video" && callSession.status !== "incoming" && (
                <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "#111", height: 200, marginBottom: 22 }}>
                  <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 10, right: 10, width: 72, height: 100, borderRadius: 10, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" }}>
                    <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
              )}
              {callSession.mode === "audio" && callSession.status === "active" && (
                <audio ref={remoteAudioRef} autoPlay playsInline />
              )}

              {callSession.status === "incoming" ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
                  <button type="button" onClick={rejectCall} style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(239,68,68,0.4)" }}><PhoneOff size={22} color="#fff" /></button>
                  <button type="button" onClick={acceptCall} style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: ORANGE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${ORANGE}50` }}>{callSession.mode === "video" ? <Video size={22} color="#fff" /> : <Phone size={22} color="#fff" />}</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                  {[
                    { icon: callSession.isMuted ? MicOff : Mic, onClick: toggleMute, active: callSession.isMuted },
                    ...(callSession.mode === "video" ? [{ icon: callSession.isCameraOff ? VideoOff : Video, onClick: toggleCamera, active: callSession.isCameraOff }] : []),
                    ...(callSession.mode === "video" ? [{ icon: callSession.isScreenSharing ? ScreenShareOff : ScreenShare, onClick: toggleScreenShare, active: callSession.isScreenSharing }] : []),
                    ...(callSession.mode === "video" ? [{ icon: SwitchCamera, onClick: switchCamera, active: false }] : []),
                    { icon: Volume2, onClick: toggleSpeaker, active: !callSession.isSpeakerOn },
                  ].map((btn, i) => (
                    <button key={i} type="button" onClick={btn.onClick}
                      style={{ width: 50, height: 50, borderRadius: 14, border: "none", background: btn.active ? "#ef4444" : "rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <btn.icon size={20} />
                    </button>
                  ))}
                  <button type="button" onClick={() => closeCall(true)} style={{ width: 50, height: 50, borderRadius: 14, border: "none", background: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
                    <PhoneOff size={20} color="#fff" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 420, borderRadius: 18, background: "#fff", boxShadow: "0 24px 80px rgba(15,23,42,0.25)", overflow: "hidden" }}>
            <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Tạo nhóm chat</div>
              <button type="button" onClick={() => setShowCreateGroup(false)} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Tên nhóm"
                style={{ width: "100%", height: 40, borderRadius: 12, border: "1px solid #e2e8f0", padding: "0 12px", boxSizing: "border-box", fontSize: 14, marginBottom: 12 }}
              />
              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {dedupConversations([
                  ...conversations.filter((c) => c.type !== "group" && getConversationPeerId(c)),
                  ...searchResults.map((u) => ({ id: `new_${toId(u.id)}`, targetUserId: toId(u.id), name: u.name, avatar: u.avatar, status: "accepted" })),
                ]).map((item) => {
                  const peerId = getConversationPeerId(item);
                  if (!peerId) return null;
                  const checked = groupMemberIds.includes(peerId);
                  return (
                    <label key={peerId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, cursor: "pointer", background: checked ? ORANGE_LIGHT : "#fff" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setGroupMemberIds((prev) => e.target.checked ? [...prev, peerId] : prev.filter((id) => id !== peerId));
                        }}
                      />
                      <img src={getAvatarUrl(item.avatar, peerId)} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{item.name}</span>
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleCreateGroup}
                style={{ width: "100%", height: 42, borderRadius: 12, border: "none", background: ORANGE, color: "#fff", fontWeight: 800, cursor: "pointer", marginTop: 14 }}
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes pulse { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.1); } }

        .messages-shell {
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }
        .chat-list-panel { display: flex !important; }
        .mobile-back-btn { display: none; }
        .messages-scroll-area {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        @media (max-width: 768px) {
          .chat-list-panel {
            position: static !important;
            width: 100vw !important;
            min-width: 0 !important;
            max-width: none !important;
            flex: 1 1 auto !important;
          }
          .messages-shell.has-selected-chat .chat-list-panel {
            display: none !important;
          }
          .messages-shell:not(.has-selected-chat) .chat-thread-panel {
            display: none !important;
          }
          .messages-shell.has-selected-chat .chat-thread-panel {
            display: flex !important;
            width: 100vw !important;
            max-width: 100vw !important;
            flex: 1 1 100% !important;
          }
          .messages-shell.has-selected-chat .messages-scroll-area {
            padding: 12px 12px 0 !important;
          }
          .message-composer {
            padding: 8px 10px max(8px, env(safe-area-inset-bottom)) !important;
          }
          .message-composer-form {
            gap: 8px !important;
            min-width: 0 !important;
          }
          .message-composer-input input {
            font-size: 16px !important;
          }
          .chat-info-panel {
            display: none !important;
          }
          .mobile-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
