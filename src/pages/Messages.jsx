import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  FileImage,
  Inbox,
  MoreHorizontal,
  Archive,
  Paperclip,
  Pencil,
  Reply,
  Trash2,
  Search,
  Smile,
  Star,
  UserPlus,
  VolumeX,
  Mail,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { searchUsers } from "../services/searchServices";
import Card from "../components/layout/Card";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import useAuth from "../hooks/useAuth";
import useTranslation from "../hooks/useTranslation";
import {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  toggleConversationStar,
  updateConversationAction,
  updateMessageAction,
} from "../services/messageServices";
import { emitUnreadCountsChanged } from "../utils/unreadEvents";
import { playSoundEffect } from "../utils/playSoundEffect.js";

export default function Messages() {
  const t = useTranslation();
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messageEndRef = useRef(null);
  const attachmentInputRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [conversationFilter, setConversationFilter] = useState("");
  const [messageCategory, setMessageCategory] = useState("focused");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [inboxMenuOpen, setInboxMenuOpen] = useState(false);
  const [manageConversations, setManageConversations] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState([]);
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState(null);
  const [composeSearch, setComposeSearch] = useState("");
  const [composeResults, setComposeResults] = useState([]);
  const [composeSearching, setComposeSearching] = useState(false);
  const [composeSending, setComposeSending] = useState(false);
  const [composeDraft, setComposeDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesScrollRef = useRef(null);

  const startUserId = searchParams.get("userId");

  useEffect(() => {
    if (!attachment?.type.startsWith("image/")) {
      setAttachmentPreview("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(attachment);
    setAttachmentPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment]);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingConversations(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      setError(error.response?.data?.message || "Unable to load conversations");
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!composeOpen) return undefined;
    const query = composeSearch.trim();
    if (query.length < 2) {
      setComposeResults([]);
      setComposeSearching(false);
      return undefined;
    }

    let ignore = false;
    const timerId = window.setTimeout(async () => {
      try {
        setComposeSearching(true);
        const results = await searchUsers(query);
        if (!ignore) {
          setComposeResults(
            results.filter(
              (person) =>
                person._id !== user?._id &&
                person._id !== composeRecipient?._id,
            ),
          );
        }
      } catch (error) {
        if (!ignore) {
          setComposeResults([]);
          toast.error(error.response?.data?.message || "Unable to search people");
        }
      } finally {
        if (!ignore) setComposeSearching(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timerId);
    };
  }, [composeOpen, composeSearch, user?._id, composeRecipient]);

  useEffect(() => {
    let ignore = false;

    const openConversation = async () => {
      if (!startUserId) return;

      try {
        const conversation = await createOrGetConversation(startUserId);

        if (!ignore) {
          await loadConversations({ silent: true });
          navigate(`/messages/${conversation._id}`, { replace: true });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to open conversation");
      }
    };

    openConversation();

    return () => {
      ignore = true;
    };
  }, [startUserId, navigate, loadConversations]);

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        const data = await getMessages(conversationId);

        if (!ignore) {
          setMessages(data);
          await loadConversations({ silent: true });
          emitUnreadCountsChanged();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load messages");
      } finally {
        if (!ignore) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [conversationId, loadConversations]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConversation = conversations.find(
    (conversation) => conversation._id === conversationId,
  );
  const cleanConversationFilter = conversationFilter.trim().toLowerCase();
  const filteredConversations = conversations.filter((conversation) => {
    const participant = conversation.otherParticipant;
    const latestMessage = conversation.lastMessage?.text || "";
    const matchesText = !cleanConversationFilter || [participant?.name, participant?.headline, latestMessage].some(
      (value) => value?.toLowerCase().includes(cleanConversationFilter),
    );
    const matchesCategory =
      (messageCategory === "focused" &&
        !conversation.archived &&
        !conversation.spam &&
        (conversation.category || "focused") === "focused") ||
      (messageCategory === "other" &&
        conversation.category === "other" &&
        !conversation.archived &&
        !conversation.spam) ||
      (messageCategory === "jobs" &&
        !conversation.archived &&
        (conversation.category === "jobs" ||
          /(job|hiring|interview|role|application)/i.test(latestMessage))) ||
      (messageCategory === "unread" && conversation.unreadCount > 0) ||
      (messageCategory === "connections" &&
        conversation.otherParticipant?.connectionStatus === "connected") ||
      (messageCategory === "inmail" && conversation.type === "inmail") ||
      (messageCategory === "starred" && conversation.starred) ||
      (messageCategory === "archived" && conversation.archived) ||
      (messageCategory === "spam" && conversation.spam);

    return matchesText && matchesCategory;
  });

  const handleToggleStar = async (conversationIdToToggle) => {
    try {
      const starred = await toggleConversationStar(conversationIdToToggle);
      setConversations((previous) => previous.map((conversation) =>
        conversation._id === conversationIdToToggle
          ? { ...conversation, starred }
          : conversation,
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update star");
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();

    if ((!text && !attachment) || !conversationId || sending) return;

    try {
      setSending(true);
      if (replyingTo) {
        const result = await updateMessageAction(conversationId, replyingTo._id, { action: "reply", text });
        setMessages((previous) => [...previous, result.message]);
        setReplyingTo(null);
      } else {
        const createdMessage = await sendMessage(conversationId, text, null, attachment);
        setMessages((previous) => [...previous, createdMessage]);
      }
      playSoundEffect();
      setDraft("");
      setAttachment(null);
      await loadConversations({ silent: true });
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  const handleConversationAction = async (action, value) => {
    if (!conversationId) return;
    try {
      const result = await updateConversationAction(conversationId, action, value);
      setConversationMenuOpen(false);
      if (action === "delete") {
        toast.success("Conversation deleted");
        navigate("/messages", { replace: true });
        setConversations((previous) => previous.filter((item) => item._id !== conversationId));
        return;
      }
      if (result.conversation) {
        setConversations((previous) => previous.map((item) =>
          item._id === conversationId
            ? {
                ...item,
                ...result.conversation,
                otherParticipant: {
                  ...item.otherParticipant,
                  ...result.conversation.otherParticipant,
                  connectionStatus:
                    result.conversation.otherParticipant?.connectionStatus ||
                    item.otherParticipant?.connectionStatus,
                },
              }
            : item,
        ));
      }
      if (action === "report") toast.success("Conversation reported");
      if (action === "block") toast.success("Member blocked");
      if (action === "archive") toast.success(value === false ? "Conversation restored" : "Conversation archived");
      if (action === "mute") toast.success(value === false ? "Notifications unmuted" : "Conversation muted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update conversation");
    }
  };

  const handleConversationActionFor = async (id, action, value) => {
    try {
      const result = await updateConversationAction(id, action, value);
      if (result.conversation) {
        setConversations((previous) =>
          previous.map((item) =>
            item._id === id
              ? {
                  ...item,
                  ...result.conversation,
                  otherParticipant: {
                    ...item.otherParticipant,
                    ...result.conversation.otherParticipant,
                    connectionStatus:
                      result.conversation.otherParticipant?.connectionStatus ||
                      item.otherParticipant?.connectionStatus,
                  },
                }
              : item,
          ),
        );
      }
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update conversation");
    }
  };

  const handleBulkConversationAction = async (action, value = true) => {
    if (selectedConversationIds.length === 0 || bulkActionRunning) return;
    try {
      setBulkActionRunning(true);
      for (const id of selectedConversationIds) {
        await updateConversationAction(id, action, value);
      }
      if (action === "delete") {
        setConversations((current) =>
          current.filter((item) => !selectedConversationIds.includes(item._id)),
        );
        if (selectedConversationIds.includes(conversationId)) {
          navigate("/messages", { replace: true });
        }
        toast.success("Selected conversations deleted");
      } else {
        await loadConversations({ silent: true });
        toast.success(
          action === "archive"
            ? "Selected conversations archived"
            : "Selected conversations marked unread",
        );
      }
      setSelectedConversationIds([]);
      setManageConversations(false);
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update selected conversations");
      await loadConversations({ silent: true });
    } finally {
      setBulkActionRunning(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Files must be 25 MB or smaller");
      event.target.value = "";
      return;
    }
    setAttachment(file);
  };

  const addEmoji = (emoji) => {
    setDraft((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  };

  const handleMessageAction = async (messageId, payload) => {
    try {
      const result = await updateMessageAction(conversationId, messageId, payload);
      if (payload.action === "delete") {
        setMessages((current) => current.filter((message) => message._id !== messageId));
      } else if (payload.action === "reply" && result.message) {
        setMessages((current) => [...current, result.message]);
        setReplyingTo(null);
      } else if (result.message) {
        setMessages((current) => current.map((message) => message._id === messageId ? { ...message, ...result.message } : message));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update message");
    }
  };

  const scrollMessagesToBottom = () => {
    messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const handleComposeSend = async (event) => {
    event.preventDefault();
    if (!composeDraft.trim() || !composeRecipient || composeSending) return;
    try {
      setComposeSending(true);
      const conversation = await createOrGetConversation(composeRecipient._id);
      await sendMessage(conversation._id, composeDraft.trim());
      playSoundEffect();
      setComposeDraft("");
      setComposeRecipient(null);
      setComposeSearch("");
      setComposeResults([]);
      setComposeOpen(false);
      await loadConversations({ silent: true });
      navigate(`/messages/${conversation._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send message");
    } finally {
      setComposeSending(false);
    }
  };

  return (
    <div className="h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] overflow-hidden bg-[#f3f2ef]">
      <div className="mx-auto grid h-full min-h-0 max-w-[1200px] grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-0 px-3 py-3 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
        <div className="col-span-1 flex min-w-0 items-center gap-3 rounded-t-xl border border-gray-200 bg-white px-4 py-2 sm:col-span-12">
          <h1 className="shrink-0 text-lg font-semibold text-ink">{t("Messaging")}</h1>
          <label className="relative min-w-0 flex-1 sm:max-w-[272px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
            />
            <input
              type="search"
              value={conversationFilter}
              onChange={(event) => setConversationFilter(event.target.value)}
              placeholder={t("Search messages")}
              className="w-full rounded-md bg-[#EEF3F8] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="relative ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setInboxMenuOpen((open) => !open)}
              className="rounded-full p-2 text-muted-ink hover:bg-gray-100"
              aria-label="More messaging options"
              aria-expanded={inboxMenuOpen}
            >
              <MoreHorizontal size={20} />
            </button>
            {inboxMenuOpen && (
              <div className="absolute right-0 top-11 z-[70] w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                <ConversationMenuItem
                  label="Manage conversations"
                  onClick={() => {
                    setManageConversations((active) => !active);
                    setSelectedConversationIds([]);
                    setInboxMenuOpen(false);
                  }}
                />
                <ConversationMenuItem
                  label="Manage settings"
                  onClick={() => {
                    setInboxMenuOpen(false);
                    navigate("/settings");
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setComposeRecipient(null);
                setComposeSearch("");
                setComposeResults([]);
                setComposeDraft("");
                setComposeOpen(true);
              }}
              className="rounded-full p-2 text-muted-ink hover:bg-gray-100"
              aria-label="Compose message to people"
              title="New message"
            >
              <Pencil size={19} />
            </button>
          </div>
          {composeOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
              <form
                onSubmit={handleComposeSend}
                className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink">{t("New message")}</h2>
                  <button
                    type="button"
                    onClick={() => setComposeOpen(false)}
                    className="text-2xl text-muted-ink"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted-ink">
                  Search CareerLink to start a conversation.
                </p>
                <label className="mt-4 block">
                  <span className="sr-only">Search people</span>
                  <input
                    type="search"
                    value={composeSearch}
                    onChange={(event) => setComposeSearch(event.target.value)}
                    placeholder={t("Type a name to search")}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
                {composeRecipient && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                    <ProfileAvatar user={composeRecipient} size={36} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {composeRecipient.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setComposeRecipient(null)}
                      className="text-xs font-semibold text-brand"
                    >
                      Change
                    </button>
                  </div>
                )}
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto">
                  {composeSearching && (
                    <p className="px-2 py-3 text-sm text-muted-ink">{t("Searching people...")}</p>
                  )}
                  {!composeSearching &&
                    composeSearch.trim().length >= 2 &&
                    composeResults.length === 0 && (
                      <p className="px-2 py-3 text-sm text-muted-ink">No people found.</p>
                    )}
                  {composeResults.map((person) => (
                    <button
                      key={person._id}
                      type="button"
                      onClick={() => setComposeRecipient(person)}
                      disabled={Boolean(composeRecipient)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50"
                    >
                      <ProfileAvatar user={person} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-muted-ink">
                          {person.headline || person.email}
                        </span>
                      </span>
                      <UserPlus size={17} className="text-brand" />
                    </button>
                  ))}
                </div>
                <textarea
                  value={composeDraft}
                  onChange={(event) => setComposeDraft(event.target.value)}
                  rows={4}
                  placeholder={t("Write a message...")}
                  className="mt-4 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={
                    !composeDraft.trim() ||
                    !composeRecipient ||
                    composeSending
                  }
                  className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {composeSending ? t("Sending...") : t("Send message")}
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="relative z-30 col-span-1 flex min-w-0 flex-wrap items-center gap-2 rounded-b-xl border-x border-b border-gray-200 bg-white px-4 py-3 sm:col-span-12">
          <div className="relative z-50 order-first shrink-0">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen((open) => !open)}
              aria-expanded={categoryMenuOpen}
              aria-label="Focused message categories"
              className="flex h-9 items-center gap-1 rounded-full bg-emerald-800 px-4 text-sm font-semibold text-white"
            >
              {[
                { value: "focused", label: "Focused" },
                { value: "other", label: "Other" },
                { value: "archived", label: "Archived" },
                { value: "spam", label: "Spam" },
              ].find((option) => option.value === messageCategory)?.label ||
                "Focused"}
              <ChevronDown size={15} />
            </button>
            {categoryMenuOpen && (
              <div               className="absolute left-0 top-11 z-50 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                {[
                  { value: "focused", label: "Focused" },
                  { value: "other", label: "Other" },
                  { value: "archived", label: "Archived" },
                  { value: "spam", label: "Spam" },
                ].map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => {
                      setMessageCategory(category.value);
                      setCategoryMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      messageCategory === category.value
                        ? "font-semibold text-brand"
                        : "text-ink"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {[
            { value: "jobs", label: "Jobs" },
            { value: "unread", label: "Unread" },
            { value: "connections", label: "Connections" },
            { value: "inmail", label: "InMail" },
            { value: "starred", label: "Starred" },
          ].map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setMessageCategory(category.value)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
                messageCategory === category.value
                  ? "border-brand bg-sky text-brand"
                  : "border-gray-200 bg-white text-ink hover:bg-gray-50"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        <aside
          className={`${conversationId ? "hidden sm:block" : "block"} min-h-0 sm:col-span-4`}
        >
          <Card className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-t-none">
            {manageConversations && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setManageConversations(false);
                    setSelectedConversationIds([]);
                  }}
                  className="rounded-full p-1.5 text-muted-ink hover:bg-gray-100"
                  aria-label="Exit manage conversations"
                >
                  <X size={17} />
                </button>
                <span className="mr-auto text-sm text-ink">
                  {selectedConversationIds.length} selected
                </span>
                <button
                  type="button"
                  disabled={!selectedConversationIds.length || bulkActionRunning}
                  onClick={() => handleBulkConversationAction("unread", true)}
                  className="rounded-full p-2 text-muted-ink hover:bg-gray-100 disabled:opacity-40"
                  aria-label="Mark selected conversations unread"
                  title="Mark unread"
                >
                  <Mail size={17} />
                </button>
                <button
                  type="button"
                  disabled={!selectedConversationIds.length || bulkActionRunning}
                  onClick={() => handleBulkConversationAction("archive", true)}
                  className="rounded-full p-2 text-muted-ink hover:bg-gray-100 disabled:opacity-40"
                  aria-label="Archive selected conversations"
                  title="Archive"
                >
                  <Archive size={17} />
                </button>
                <button
                  type="button"
                  disabled={!selectedConversationIds.length || bulkActionRunning}
                  onClick={() => handleBulkConversationAction("delete", true)}
                  className="rounded-full p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  aria-label="Delete selected conversations"
                  title="Delete"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            )}
            {loadingConversations && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-muted-ink">
                {t("Loading conversations...")}
              </div>
            )}

            {!loadingConversations && error && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-red-600">{error}</div>
            )}

            {!loadingConversations && !error && conversations.length === 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-muted-ink">
                No conversations yet.
              </div>
            )}

            {!loadingConversations &&
              !error &&
              !manageConversations &&
              conversations.length > 0 &&
              filteredConversations.length === 0 && (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 text-sm text-muted-ink">
                  No conversations match your search.
                </div>
              )}

            {!loadingConversations &&
              (manageConversations
                ? conversations.filter((conversation) => {
                    const query = conversationFilter.trim().toLowerCase();
                    const participant = conversation.otherParticipant;
                    return (
                      !query ||
                      [participant?.name, participant?.headline, conversation.lastMessage?.text]
                        .some((value) => value?.toLowerCase().includes(query))
                    );
                  }).length > 0
                : filteredConversations.length > 0) && (
              <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
                {(manageConversations
                  ? conversations.filter((conversation) => {
                      const query = conversationFilter.trim().toLowerCase();
                      const participant = conversation.otherParticipant;
                      return (
                        !query ||
                        [participant?.name, participant?.headline, conversation.lastMessage?.text]
                          .some((value) => value?.toLowerCase().includes(query))
                      );
                    })
                  : filteredConversations
                ).map((conversation) => (
                  <ConversationListItem
                    key={conversation._id}
                    conversation={conversation}
                    active={conversation._id === conversationId}
                    currentUserId={user?._id}
                    onToggleStar={handleToggleStar}
                    onMarkUnread={(id) => handleConversationActionFor(id, "unread", true)}
                    manageMode={manageConversations}
                    selected={selectedConversationIds.includes(conversation._id)}
                    onSelect={(id) =>
                      setSelectedConversationIds((current) =>
                        current.includes(id)
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      )
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </aside>

        <main
          className={`${conversationId ? "block" : "hidden sm:block"} min-h-0 sm:col-span-8`}
        >
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            {activeConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100 sm:hidden"
                    onClick={() => navigate("/messages")}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <Link
                    to={`/profile/${activeConversation.otherParticipant?._id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <ProfileAvatar
                      user={activeConversation.otherParticipant}
                      size={44}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-ink hover:underline">
                        {activeConversation.otherParticipant?.name ||
                          "CareerLink member"}
                      </h2>
                      <p className="truncate text-xs text-muted-ink">
                        {activeConversation.otherParticipant?.headline ||
                          "CareerLink member"}
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleToggleStar(activeConversation._id)}
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand"
                    aria-label={activeConversation.starred ? "Unstar conversation" : "Star conversation"}
                  >
                    {activeConversation.starred && <Star className="fill-current" size={18} />}
                    {!activeConversation.starred && <Star size={18} />}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setConversationMenuOpen((open) => !open)}
                      className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                      aria-label="Conversation options"
                      aria-expanded={conversationMenuOpen}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                    {conversationMenuOpen && (
                      <div className="absolute right-0 top-11 z-20 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-xl">
                        <ConversationMenuItem label="Move to Other" onClick={() => handleConversationAction("label", "other")} />
                        <ConversationMenuItem label="Label as Jobs" onClick={() => handleConversationAction("label", "jobs")} />
                        <ConversationMenuItem label="Mark as unread" onClick={() => handleConversationAction("unread", true)} />
                        <ConversationMenuItem label={activeConversation.starred ? "Unstar" : "Star"} onClick={() => handleToggleStar(activeConversation._id)} />
                        <ConversationMenuItem label={activeConversation.muted ? "Unmute" : "Mute"} onClick={() => handleConversationAction("mute", !activeConversation.muted)} />
                        <ConversationMenuItem label={activeConversation.archived ? "Restore from archive" : "Archive"} onClick={() => handleConversationAction("archive", !activeConversation.archived)} />
                        <ConversationMenuItem label="Seems like AI slop" onClick={() => toast.success("Feedback submitted")} />
                        <ConversationMenuItem label="Report conversation" onClick={() => handleConversationAction("report", true)} />
                        <ConversationMenuItem label="Block member" onClick={() => handleConversationAction("block", true)} />
                        <ConversationMenuItem label="Delete conversation" danger onClick={() => handleConversationAction("delete", true)} />
                        <ConversationMenuItem label="Manage settings" onClick={() => handleConversationAction("settings", true)} />
                      </div>
                    )}
                  </div>

                  {activeConversation.muted && <VolumeX size={16} className="text-muted-ink" aria-label="Muted conversation" />}

                  {activeConversation.unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                      {activeConversation.unreadCount} unread
                    </span>
                  )}
                </div>

                <div
                  ref={messagesScrollRef}
                  onScroll={(event) => setShowScrollDown(event.currentTarget.scrollHeight - event.currentTarget.scrollTop - event.currentTarget.clientHeight > 120)}
                  className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4"
                >
                  {loadingMessages ? (
                    <div className="space-y-3">
                      <div className="h-10 w-2/3 rounded-2xl bg-gray-100" />
                      <div className="ml-auto h-10 w-1/2 rounded-2xl bg-sky" />
                      <div className="h-10 w-3/5 rounded-2xl bg-gray-100" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[320px] items-center justify-center text-center">
                      <div>
                        <ProfileAvatar
                          user={activeConversation.otherParticipant}
                          size={64}
                          className="mx-auto"
                        />
                        <h3 className="mt-3 text-sm font-semibold text-ink">
                          Start the conversation
                        </h3>
                        <p className="mt-1 text-sm text-muted-ink">
                          Messages with this member will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const isMine = message.sender?._id === user?._id;
                        const sharedPost = message.post;
                        const sharedJob = message.job;
                        const dateLabel = new Date(message.createdAt).toLocaleDateString([], {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                        const previousDate = index > 0
                          ? new Date(messages[index - 1].createdAt).toDateString()
                          : null;

                        return (
                          <div key={message._id}>
                            {new Date(message.createdAt).toDateString() !== previousDate && (
                              <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                                <span className="h-px flex-1 bg-gray-200" />
                                <span>{dateLabel}</span>
                                <span className="h-px flex-1 bg-gray-200" />
                              </div>
                            )}
                            <div className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                                    <div className={`mr-2 flex items-center gap-1 self-center opacity-0 transition group-hover:opacity-100 ${isMine ? "order-first" : "order-last"}`}>
                                      <button type="button" onClick={() => handleMessageAction(message._id, { action: "react", emoji: "👍" })} className="rounded-full p-1 hover:bg-gray-100" aria-label="React to message">👍</button>
                                      <button type="button" onClick={() => setReplyingTo(message)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100" aria-label="Reply to message"><Reply size={14} /></button>
                                      {isMine && <button type="button" onClick={() => handleMessageAction(message._id, { action: "delete" })} className="rounded-full p-1 text-red-500 hover:bg-red-50" aria-label="Delete message"><Trash2 size={14} /></button>}
                                    </div>
                                    <div
                              className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                                isMine
                                  ? "bg-brand text-white"
                                  : "bg-gray-100 text-ink"
                              }`}
                            >
                              {sharedPost && (
                                <div className="mb-3 rounded-lg border border-white/30 bg-white/10 p-3 text-left text-ink">
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand">Shared post</p>
                                  <div className="flex items-center gap-2">
                                    <ProfileAvatar user={sharedPost.author} size={28} />
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-gray-900">{sharedPost.author?.name}</p>
                                      <p className="truncate text-[11px] text-gray-500">{sharedPost.author?.headline || "CareerLink member"}</p>
                                    </div>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{sharedPost.text || "Shared a post"}</p>
                                  {sharedPost.image?.url && <img src={sharedPost.image.url} alt="Shared post" className="mt-2 max-h-40 w-full rounded object-cover" />}
                                  {sharedPost.video?.url && <video src={sharedPost.video.url} controls className="mt-2 max-h-40 w-full rounded object-contain" />}
                                  <Link to={`/profile/${sharedPost.author?._id}`} className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline">Open profile</Link>
                                </div>
                              )}
                              {sharedJob && (
                                <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3 text-left text-ink">
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand">Shared job</p>
                                  <p className="text-sm font-semibold text-gray-900">{sharedJob.title}</p>
                                  <p className="mt-1 text-xs text-gray-600">{sharedJob.company} · {sharedJob.location}</p>
                                  <p className="mt-1 text-xs text-gray-500">{[sharedJob.type, sharedJob.workMode, sharedJob.salary].filter(Boolean).join(" · ")}</p>
                                  <Link to={`/jobs?jobId=${sharedJob._id}`} className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline">View on CareerLink</Link>
                                </div>
                              )}
                              {message.text && (
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                              )}
                              {message.attachment?.url && (
                                <a
                                  href={message.attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 block"
                                >
                                  {message.attachment.type?.startsWith("image/") ? (
                                    <img src={message.attachment.url} alt={message.attachment.name || "Attached image"} className="max-h-64 max-w-full rounded-lg object-contain" />
                                  ) : (
                                    <span className="font-medium underline">{message.attachment.name || "Download attachment"}</span>
                                  )}
                                  {message.reactions?.map((reaction) => <span key={`${message._id}-${reaction.user}`} className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-xs shadow">{reaction.emoji}</span>)}
                                </a>
                              )}
                              <p
                                className={`mt-1 text-[11px] ${
                                  isMine ? "text-white/80" : "text-muted-ink"
                                }`}
                              >
                                {new Date(message.createdAt).toLocaleString([], {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {isMine && message.readReceipts?.some((readerId) => readerId.toString() === activeConversation?.otherParticipant?._id) && (
                                <p className="mt-1 text-right text-[10px] font-medium text-white/80">Seen</p>
                              )}
                            </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messageEndRef} />
                    </div>
                  )}
                  {showScrollDown && (
                    <button type="button" onClick={scrollMessagesToBottom} className="sticky bottom-3 left-full grid h-9 w-9 -translate-x-2 place-items-center rounded-full bg-brand text-white shadow-lg" aria-label="Scroll to latest messages">
                      <ArrowDown size={18} />
                    </button>
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-gray-100 bg-white"
                >
                  {replyingTo && (
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-xs text-muted-ink">
                      <span className="truncate">Replying to: {replyingTo.text || "attachment"}</span>
                      <button type="button" onClick={() => setReplyingTo(null)} className="font-semibold text-brand">Cancel</button>
                    </div>
                  )}
                  {attachment && (
                    <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-brand/20 bg-sky px-3 py-2">
                      {attachment.type.startsWith("image/") ? (
                        <img
                          src={attachmentPreview}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-white text-xs font-bold uppercase text-brand">
                          {attachment.name.split(".").pop()?.slice(0, 4) || "FILE"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{attachment.name}</p>
                        <p className="text-xs text-muted-ink">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={() => setAttachment(null)} className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                    </div>
                  )}
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage(event);
                      }
                    }}
                    rows={composerExpanded ? 4 : 2}
                    maxLength={2000}
                    placeholder={t(replyingTo ? "Write a reply..." : "Write a message...")}
                    className="mx-3 mt-3 block w-[calc(100%-1.5rem)] resize-none rounded-lg border border-gray-200 bg-[#f7f5f2] px-3 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="*/*"
                        onChange={handleAttachmentChange}
                        className="hidden"
                      />
                      <button type="button" onClick={() => attachmentInputRef.current?.click()} className="rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="Add image">
                        <FileImage size={20} />
                      </button>
                      <button type="button" onClick={() => attachmentInputRef.current?.click()} className="rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="Attach image file">
                        <Paperclip size={20} />
                      </button>
                      <div className="relative">
                        <button type="button" onClick={() => setEmojiOpen((open) => !open)} className="rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="Add emoji">
                        <Smile size={20} />
                        </button>
                        {emojiOpen && (
                          <div className="absolute bottom-11 left-0 z-20">
                            <EmojiPicker onEmojiClick={(emojiData) => addEmoji(emojiData.emoji)} width={320} height={380} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setComposerExpanded((expanded) => !expanded)}
                        className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                        aria-label={composerExpanded ? "Collapse composer" : "Expand composer"}
                      >
                        <ChevronUp className={composerExpanded ? "rotate-180" : ""} size={19} />
                      </button>
                      <button
                        type="submit"
                        disabled={(!draft.trim() && !attachment) || sending}
                        className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        {sending ? t("Sending...") : t("Send")}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-ink">
                <div>
                  <Inbox className="mx-auto text-brand" size={42} />
                  <p className="mt-3 font-medium text-ink">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-muted-ink">
                    Choose a thread from the inbox to read and reply.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}

function ConversationListItem({
  conversation,
  active,
  currentUserId,
  onToggleStar,
  manageMode = false,
  selected = false,
  onSelect,
}) {
  const participant = conversation.otherParticipant;
  const lastText = conversation.lastMessage?.text || "No messages yet";
  const isMine = conversation.lastMessage?.sender?._id === currentUserId;
  const preview = conversation.lastMessage?.post
    ? `${isMine ? "You shared a post" : "Shared a post"}`
    : conversation.lastMessage
      ? `${isMine ? "You: " : ""}${lastText}`
      : lastText;
  const timestamp = conversation.lastMessage?.createdAt || conversation.updatedAt;

  const content = (
    <>
      <div className="relative shrink-0">
        <ProfileAvatar user={participant} size={48} />
        {conversation.muted && (
          <VolumeX size={14} className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 text-muted-ink" aria-label="Muted conversation" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-ink">
            {participant?.name || "CareerLink member"}
          </h2>

          <div className="flex items-center gap-2">
            {timestamp && (
              <span className="shrink-0 text-[11px] text-muted-ink">
                {new Date(timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {conversation.muted && <VolumeX size={13} className="text-muted-ink" aria-label="Muted conversation" />}
            {!manageMode && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  onToggleStar?.(conversation._id);
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-brand"
                aria-label={conversation.starred ? "Unstar conversation" : "Star conversation"}
              >
                {conversation.starred && <Star className="fill-current" size={14} />}
                {!conversation.starred && <Star size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={`truncate text-sm ${
              conversation.unread ? "font-semibold text-ink" : "text-muted-ink"
            }`}
          >
            {preview}
          </p>
        </div>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center self-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
        </span>
      )}
    </>
  );

  if (manageMode) {
    return (
      <div
        className={`flex cursor-pointer items-center gap-3 border-l-4 px-4 py-3 transition hover:bg-gray-50 ${
          selected ? "border-brand bg-sky" : "border-transparent"
        }`}
        onClick={() => onSelect?.(conversation._id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(conversation._id);
          }
        }}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${
            selected
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-gray-300 bg-white text-transparent"
          }`}
        >
          <Check size={16} />
        </span>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/messages/${conversation._id}`}
      className={`flex items-center gap-3 border-l-4 px-4 py-3 transition hover:bg-gray-50 ${
        active ? "border-brand bg-sky" : "border-transparent"
      }`}
    >
      {content}
    </Link>
  );
}

function ConversationMenuItem({ label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
        danger ? "text-red-600" : "text-ink"
      }`}
    >
      {label}
    </button>
  );
}
