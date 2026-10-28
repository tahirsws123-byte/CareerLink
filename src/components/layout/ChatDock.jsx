import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import ProfileAvatar from "./ProfileAvatar";
import useAuth from "../../hooks/useAuth";
import { searchUsers } from "../../services/searchServices";
import {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  updateConversationAction,
} from "../../services/messageServices";
import { emitUnreadCountsChanged } from "../../utils/unreadEvents";

export default function ChatDock() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState("");
  const [composeResults, setComposeResults] = useState([]);
  const [composeSearching, setComposeSearching] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState([]);
  const [composeDraft, setComposeDraft] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageConversations, setManageConversations] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState([]);
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  const [messageExpanded, setMessageExpanded] = useState(false);
  const messagesRef = useRef(null);
  const endRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setConversations(await getConversations());
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && location.pathname !== "/messages" && !location.pathname.startsWith("/messages/")) {
      loadConversations();
    }
  }, [open, location.pathname, loadConversations]);

  useEffect(() => {
    if (!open || !activeConversationId) return undefined;

    let ignore = false;
    const loadThread = async () => {
      try {
        const result = await getMessages(activeConversationId);
        if (!ignore) {
          setMessages(result);
          const updatedConversations = await getConversations();
          if (!ignore) setConversations(updatedConversations);
          emitUnreadCountsChanged();
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Unable to load conversation");
          setActiveConversationId(null);
        }
      }
    };

    loadThread();
    return () => {
      ignore = true;
    };
  }, [open, activeConversationId]);

  useEffect(() => {
    if (!open || !composeOpen) return undefined;
    const query = composeSearch.trim();
    if (query.length < 2) {
      setComposeResults([]);
      setComposeSearching(false);
      return undefined;
    }

    const selectedIds = new Set(composeRecipients.map((person) => person._id));
    let ignore = false;
    const timerId = window.setTimeout(async () => {
      try {
        setComposeSearching(true);
        const results = await searchUsers(query);
        if (!ignore) {
          setComposeResults(
            results.filter(
              (person) =>
                person._id !== user?._id && !selectedIds.has(person._id),
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
  }, [open, composeOpen, composeSearch, composeRecipients, user?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (location.pathname === "/messages" || location.pathname.startsWith("/messages/")) {
    return null;
  }

  const activeConversation = conversations.find(
    (conversation) => conversation._id === activeConversationId,
  );
  const participant = activeConversation?.otherParticipant;
  const cleanSearch = search.trim().toLowerCase();
  const visibleConversations = conversations.filter((conversation) => {
    if (conversation.archived || conversation.spam) return false;
    const name = conversation.otherParticipant?.name?.toLowerCase() || "";
    const preview = conversation.lastMessage?.text?.toLowerCase() || "";
    return (
      !cleanSearch || name.includes(cleanSearch) || preview.includes(cleanSearch)
    );
  });
  const unreadCount = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount || 0),
    0,
  );

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId || sending) return;

    try {
      setSending(true);
      const message = await sendMessage(activeConversationId, text);
      setMessages((current) => [...current, message]);
      setDraft("");
      const updatedConversations = await getConversations();
      setConversations(updatedConversations);
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  const handleConversationAction = async (id, action) => {
    try {
      await updateConversationAction(id, action, true);
      setMenuOpen(false);
      if (action === "delete") {
        setConversations((current) => current.filter((item) => item._id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      } else if (action === "archive") {
        setActiveConversationId(null);
        setMessages([]);
        await loadConversations();
        toast.success("Conversation archived");
      } else {
        await loadConversations();
        toast.success("Conversation marked unread");
      }
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update conversation");
    }
  };

  const handleBulkConversationAction = async (action) => {
    if (!selectedConversationIds.length || bulkActionRunning) return;
    try {
      setBulkActionRunning(true);
      for (const id of selectedConversationIds) {
        await updateConversationAction(id, action, true);
      }
      if (action === "delete") {
        setConversations((current) =>
          current.filter((item) => !selectedConversationIds.includes(item._id)),
        );
        if (selectedConversationIds.includes(activeConversationId)) {
          setActiveConversationId(null);
          setMessages([]);
        }
        toast.success("Selected conversations deleted");
      } else {
        await loadConversations();
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
      await loadConversations();
    } finally {
      setBulkActionRunning(false);
    }
  };

  const handleComposeSend = async (event) => {
    event.preventDefault();
    if (!composeDraft.trim() || composeRecipients.length === 0 || composeSending) return;

    try {
      setComposeSending(true);
      for (const recipient of composeRecipients) {
        const conversation = await createOrGetConversation(recipient._id);
        await sendMessage(conversation._id, composeDraft.trim());
      }
      setComposeDraft("");
      setComposeRecipients([]);
      setComposeSearch("");
      setComposeResults([]);
      setComposeOpen(false);
      await loadConversations();
      emitUnreadCountsChanged();
      toast.success(`Message sent to ${composeRecipients.length} people`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send message");
    } finally {
      setComposeSending(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-4 z-40 sm:right-6">
      {open && (
        <section
          aria-label="Chat"
          className={`mb-0 flex ${activeConversationId && messageExpanded ? "h-[min(760px,calc(100dvh-5rem))] w-[min(820px,calc(100vw-2rem))]" : "h-[min(560px,calc(100dvh-5rem))] w-[min(620px,calc(100vw-2rem))]"} flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-[0_0_24px_rgba(0,0,0,0.2)]`}
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 px-3">
            {activeConversationId || composeOpen ? (
              <button
                type="button"
                onClick={() => {
                  setComposeOpen(false);
                  setActiveConversationId(null);
                  setMessages([]);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <ProfileAvatar user={user} size={34} />
            )}
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {composeOpen ? "New message" : participant?.name || "Messaging"}
            </h2>
            {!activeConversationId && !composeOpen && (
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
                aria-label="Compose message to multiple people"
                title="New message"
              >
                <Pencil size={18} />
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
                aria-label="More messaging options"
                aria-expanded={menuOpen}
                title="Messaging options"
              >
                <MoreHorizontal size={19} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                  {activeConversationId ? (
                    <>
                      <DockMenuItem
                        label="Delete"
                        danger
                        onClick={() =>
                          handleConversationAction(activeConversationId, "delete")
                        }
                      />
                      <DockMenuItem
                        label="Mark unread"
                        onClick={() =>
                          handleConversationAction(activeConversationId, "unread")
                        }
                      />
                      <DockMenuItem
                        label="Archive"
                        onClick={() =>
                          handleConversationAction(activeConversationId, "archive")
                        }
                      />
                    </>
                  ) : (
                    <>
                      <DockMenuItem
                        label={
                          manageConversations
                            ? "Done managing conversations"
                            : "Manage conversations"
                        }
                        onClick={() => {
                          setManageConversations((current) => !current);
                          setSelectedConversationIds([]);
                          setMenuOpen(false);
                        }}
                      />
                      <Link
                        to="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-gray-50"
                      >
                        Manage settings
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            {activeConversationId && (
              <button
                type="button"
                onClick={() => setMessageExpanded((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
                aria-label={messageExpanded ? "Restore chat size" : "Expand chat"}
                title={messageExpanded ? "Restore" : "Expand"}
              >
                {messageExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
              aria-label="Minimize chat"
            >
              <Minus size={18} />
            </button>
          </header>

          {composeOpen ? (
            <form onSubmit={handleComposeSend} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                <p className="mb-3 text-xs text-muted-ink">
                  Search CareerLink members and select one or more recipients.
                </p>
                <input
                  type="search"
                  value={composeSearch}
                  onChange={(event) => setComposeSearch(event.target.value)}
                  placeholder="Search people"
                  aria-label="Search people"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
                {composeRecipients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {composeRecipients.map((person) => (
                      <button
                        key={person._id}
                        type="button"
                        onClick={() =>
                          setComposeRecipients((current) =>
                            current.filter((item) => item._id !== person._id),
                          )
                        }
                        className="rounded-full bg-sky px-3 py-1 text-xs font-medium text-brand hover:bg-blue-100"
                      >
                        {person.name} ×
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  {composeSearching && (
                    <p className="px-2 py-3 text-sm text-muted-ink">Searching people...</p>
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
                      onClick={() =>
                        setComposeRecipients((current) => [...current, person])
                      }
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
                    </button>
                  ))}
                </div>
              </div>
              <div className="shrink-0 border-t border-gray-100 p-3">
                <textarea
                  value={composeDraft}
                  onChange={(event) => setComposeDraft(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="w-full resize-y rounded-lg bg-[#f3f2ef] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  disabled={
                    !composeDraft.trim() ||
                    composeRecipients.length === 0 ||
                    composeSending
                  }
                  className="mt-2 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {composeSending
                    ? "Sending..."
                    : `Send to ${composeRecipients.length || "people"}`}
                </button>
              </div>
            </form>
          ) : activeConversationId ? (
            <>
              <div
                ref={messagesRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <ProfileAvatar user={participant} size={56} />
                    <p className="mt-3 text-sm font-semibold text-ink">
                      Start a conversation
                    </p>
                    <p className="mt-1 text-xs text-muted-ink">
                      Send a message to {participant?.name || "this person"}.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = (message.sender?._id || message.sender) === user?._id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                            isMine ? "bg-brand text-white" : "bg-gray-100 text-ink"
                          }`}
                        >
                          {message.text || (message.post ? "Shared a post" : message.job ? "Shared a job" : "Attachment")}
                          {message.job && <Link to={`/jobs?jobId=${message.job._id}`} className="mt-1 block text-xs font-semibold underline">View {message.job.title}</Link>}
                          <time className={`mt-1 block text-[10px] ${isMine ? "text-white/70" : "text-muted-ink"}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={handleSend} className="flex shrink-0 items-end gap-2 border-t border-gray-100 p-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend(event);
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="min-h-10 max-h-24 min-w-0 flex-1 resize-y rounded-lg bg-[#f3f2ef] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <>
              {manageConversations && (
                <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManageConversations(false);
                      setSelectedConversationIds([]);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100"
                    aria-label="Exit manage conversations"
                  >
                    <X size={17} />
                  </button>
                  <span className="mr-auto text-xs text-muted-ink">
                    {selectedConversationIds.length} selected
                  </span>
                  <button
                    type="button"
                    disabled={!selectedConversationIds.length || bulkActionRunning}
                    onClick={() => handleBulkConversationAction("unread")}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100 disabled:opacity-40"
                    aria-label="Mark selected conversations unread"
                    title="Mark unread"
                  >
                    <Mail size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedConversationIds.length || bulkActionRunning}
                    onClick={() => handleBulkConversationAction("archive")}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100 disabled:opacity-40"
                    aria-label="Archive selected conversations"
                    title="Archive"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedConversationIds.length || bulkActionRunning}
                    onClick={() => handleBulkConversationAction("delete")}
                    className="grid h-8 w-8 place-items-center rounded-full text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Delete selected conversations"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className="shrink-0 border-b border-gray-100 px-3 py-3">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search messages"
                  aria-label="Search conversations"
                  className="w-full rounded-full bg-[#f3f2ef] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {loading ? (
                  <p className="px-4 py-5 text-sm text-muted-ink">Loading conversations...</p>
                ) : (manageConversations ? conversations : visibleConversations).length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MessageCircle className="mx-auto text-muted-ink" size={28} />
                    <p className="mt-2 text-sm font-medium text-ink">
                      {conversations.length ? "No matching conversations" : "No conversations yet"}
                    </p>
                  </div>
                ) : (
                  (manageConversations ? conversations : visibleConversations).map((conversation) => {
                    const person = conversation.otherParticipant;
                    const selected = selectedConversationIds.includes(conversation._id);
                    return (
                      <button
                        key={conversation._id}
                        type="button"
                        onClick={() => {
                          if (manageConversations) {
                            setSelectedConversationIds((current) =>
                              current.includes(conversation._id)
                                ? current.filter((id) => id !== conversation._id)
                                : [...current, conversation._id],
                            );
                            return;
                          }
                          setMessages([]);
                          setActiveConversationId(conversation._id);
                        }}
                        className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 ${
                          selected ? "bg-sky" : ""
                        }`}
                      >
                        {manageConversations && (
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                              selected
                                ? "border-emerald-700 bg-emerald-700 text-white"
                                : "border-gray-300 bg-white text-transparent"
                            }`}
                          >
                            <Check size={13} />
                          </span>
                        )}
                        <div className="relative">
                          <ProfileAvatar user={person} size={42} />
                          {conversation.unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {person?.name || "CareerLink member"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-ink">
                            {conversation.lastMessage?.text || "Start a conversation"}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close chat dock" : "Open chat dock"}
        className="ml-auto flex h-14 items-center gap-3 rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 text-ink shadow-[0_0_16px_rgba(0,0,0,0.16)] transition hover:bg-gray-50"
      >
        <span className="text-sm font-semibold">Messaging</span>
        {!open && unreadCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {open ? <X size={17} className="text-muted-ink" /> : <Minus size={17} className="text-muted-ink" />}
      </button>
    </div>
  );
}

function DockMenuItem({ label, onClick, danger = false }) {
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
