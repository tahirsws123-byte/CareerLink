import {
  BarChart3,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Smile,
  MoreVertical,
  Share2,
  X,
  Flag,
  Bookmark,
  Link as LinkIcon,
  Bell,
  Pencil,
  Trash2,
  MessageSquareOff,
  MapPin,
  MonitorPlay,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import api from "../../services/api.js";
import { createOrGetConversation, sendMessage } from "../../services/messageServices";
import { searchUsers } from "../../services/searchServices";
import Avatar from "../layout/Avatar";
import ProfileAvatar from "../layout/ProfileAvatar.jsx";
import PostText from "./PostText.jsx";
import useTranslation from "../../hooks/useTranslation";

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  if (!name) return colors[0];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function PostCard({
  post,
  onDelete,
  onLike,
  liking,
  onEdit,
  onRepost,
  reposting,
  onReact,
  onToggleSave,
  saved = false,
  onToggleFollow,
  isFollowing = false,
  followLoading = false,
  onDismiss,
  groupPost = false,
  groupIsOwner = false,
  onRecommendPost,
  onToggleComments,
  highlighted = false,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [savedState, setSavedState] = useState(saved);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [showPostDeleteModal, setShowPostDeleteModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [pollState, setPollState] = useState(post.repostOf?.poll || post.poll || null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [sendQuery, setSendQuery] = useState("");
  const [sendResults, setSendResults] = useState([]);
  const [selectedSendUsers, setSelectedSendUsers] = useState([]);
  const [sendingPost, setSendingPost] = useState(false);
  const menuRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const { user } = useAuth();
  const t = useTranslation();
  const isOwner = user?._id === post.author?._id;
  const originalPost = post.repostOf || post;
  const isRepost = Boolean(post.repostOf);
  const isLiked = post.likes?.some((id) => id.toString() === user?._id);
  const reactions = ["👍", "❤️", "😂", "😮", "😢", "👏"];
  const currentReaction = post.reactions?.find(
    (reaction) => (reaction.user?._id || reaction.user)?.toString() === user?._id,
  )?.emoji;
  const pollPost = post.repostOf || post;
  const viewerId = user?._id?.toString();
  const pollHasVoted = Boolean(pollState?.options?.some((option) =>
    option.votes?.some((voter) => (voter?._id || voter)?.toString() === viewerId),
  ));
  const [pollClosed, setPollClosed] = useState(false);
  const [pollSubmitting, setPollSubmitting] = useState(false);

  useEffect(() => {
    setPollState(post.repostOf?.poll || post.poll || null);
  }, [post._id, post.poll, post.repostOf?.poll]);

  useEffect(() => {
    setSavedState(saved);
  }, [saved]);

  useEffect(() => {
    const refreshPollStatus = () => {
      setPollClosed(Boolean(
        pollState?.expiresAt &&
        new Date(pollState.expiresAt).getTime() <= Date.now(),
      ));
    };
    refreshPollStatus();
    const timer = window.setInterval(refreshPollStatus, 60_000);
    return () => window.clearInterval(timer);
  }, [pollState?.expiresAt]);

  const submitPollVote = async (optionId) => {
    if (pollSubmitting || pollClosed || pollHasVoted) return;
    try {
      setPollSubmitting(true);
      const { data } = await api.post(`/posts/${pollPost._id}/poll/vote`, { optionId });
      setPollState(data.poll);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to submit poll vote");
    } finally {
      setPollSubmitting(false);
    }
  };
  const [commentText, setCommentText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTitle, setEditModalTitle] = useState("Edit Post");
  const [editText, setEditText] = useState(post.text || "");
  const [editImage, setEditImage] = useState(null);
  const [editPreview, setEditPreview] = useState(post.image?.url || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const submitPostReport = async (event) => {
    event.preventDefault();
    try {
      setReporting(true);
      await api.post(`/posts/${post._id}/report`, { reason: reportReason, details: reportDetails });
      setShowReportModal(false);
      setReportDetails("");
      toast.success("Post report submitted for review");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to report this post");
    } finally {
      setReporting(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await api.get(`/comments/${post._id}`);
      setComments(response.data);
      setCommentCount(response.data.length);
    } catch (error) {
      console.log(error);
      toast.error("Unable to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleEditPost = async () => {
    if (!editText.trim() && !editImage && !post.image?.url && !post.video?.url) {
      toast.error("Post text or image is required");
      return;
    }

    try {
      setIsUpdating(true);

      const formData = new FormData();

      formData.append("text", editText);

      if (editImage) {
        formData.append("image", editImage);
      }

      const response = await api.put(`/posts/${post._id}`, formData);

      // Parent Feed ko updated post dena
      if (onEdit) {
        onEdit(response.data);
      }
      setEditImage(null);
      setEditPreview(response.data.image?.url || "");

      setShowEditModal(false);

      toast.success("Post updated successfully");
    } catch (error) {
      console.error("Edit post error:", error);

      toast.error(error.response?.data?.message || "Unable to update post");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (deletingCommentId) return;

    const commentToDelete = comments.find(
      (comment) => comment._id === commentId,
    );

    if (!commentToDelete) return;

    setDeletingCommentId(commentId);
    setActiveCommentMenu(null);
    setComments((prev) => prev.filter((comment) => comment._id !== commentId));
    setCommentCount((prev) => Math.max(0, prev - 1));

    try {
      await api.delete(`/comments/${commentId}`);
      toast.success("Comment deleted");
    } catch (error) {
      setComments((prev) => [commentToDelete, ...prev]);
      setCommentCount((prev) => prev + 1);
      toast.error(error.response?.data?.message || "Unable to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const openDeleteModal = (commentId) => {
    setSelectedCommentId(commentId);
    setShowDeleteModal(true);
    setActiveCommentMenu(null);
  };

  const openPostDeleteModal = () => {
    setShowPostDeleteModal(true);
    setShowMenu(false);
  };

  const closePostDeleteModal = () => {
    setShowPostDeleteModal(false);
  };

  const confirmDeletePost = async () => {
    if (isDeletingPost) return;

    setIsDeletingPost(true);
    try {
      await onDelete(post._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete post");
    } finally {
      setIsDeletingPost(false);
      setShowPostDeleteModal(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCommentId(null);
  };

  const confirmDeleteComment = async () => {
    if (!selectedCommentId) return;

    setShowDeleteModal(false);
    await handleDeleteComment(selectedCommentId);
    setSelectedCommentId(null);
  };

  const handleCreateComment = async () => {
    if (post.commentsDisabled || !commentText.trim() || isCreatingComment) return;

    setIsCreatingComment(true);

    try {
      const response = await api.post("/comments", {
        postId: post._id,
        text: commentText,
      });

      setComments((prev) => [response.data, ...prev]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
      toast.success("Comment posted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to post comment");
    } finally {
      setIsCreatingComment(false);
    }
  };

  const handleSendPost = async () => {
    if (selectedSendUsers.length === 0 || sendingPost) return;

    try {
      setSendingPost(true);
      for (const person of selectedSendUsers) {
        const conversation = await createOrGetConversation(person._id);
        await sendMessage(conversation._id, sendNote.trim(), post._id);
      }
      setShowSendModal(false);
      setSendNote("");
      setSendQuery("");
      setSendResults([]);
      setSelectedSendUsers([]);
      toast.success(
        `Post sent to ${selectedSendUsers.length} ${
          selectedSendUsers.length === 1 ? "person" : "people"
        }`,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send post");
    } finally {
      setSendingPost(false);
    }
  };

  useEffect(() => {
    if (!showSendModal) return;

    const controller = new AbortController();
    const query = sendQuery.trim();

    if (!query) {
      setSendResults([]);
      return undefined;
    }

    const search = async () => {
      try {
        const users = await searchUsers(query);
        if (!controller.signal.aborted) {
          setSendResults(
            users.filter(
              (person) =>
                person._id !== user?._id &&
                !selectedSendUsers.some((selected) => selected._id === person._id),
            ),
          );
        }

      } catch (error) {
        if (!controller.signal.aborted) {
          setSendResults([]);
          toast.error(
            error.response?.data?.message || "Unable to search people",
          );
        }
      }
    };

    search();
    return () => controller.abort();
  }, [sendQuery, showSendModal, user?._id, selectedSendUsers]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target)
      ) {
        setShowReactionPicker(false);
      }
    }
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
        setShowReactionPicker(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const getPostLink = () => {
    const url = new URL(window.location.href);
    url.hash = `post-${post._id}`;
    return url.toString();
  };

  const copyPostLink = async () => {
    const link = getPostLink();

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Post link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const openEditPost = (label) => {
    setShowMenu(false);
    setShowEditModal(true);
    setEditText(post.text || "");
    setEditImage(null);
    setEditPreview(post.image?.url || "");
    setEditModalTitle(label);
  };

  const handleSavePost = async () => {
    try {
      const result = await onToggleSave?.(post._id);
      setSavedState(typeof result?.saved === "boolean" ? result.saved : !savedState);
    } catch {
      return;
    }
  };

  const openSendModal = () => {
    setSelectedSendUsers([]);
    setSendNote("");
    setSendQuery("");
    setSendResults([]);
    setShowSendModal(true);
  };

  return (
    <div id={`post-${post._id}`} className={`scroll-mt-20 rounded-lg border bg-white p-3 transition-shadow duration-500 ${highlighted ? "border-brand ring-4 ring-brand/20 shadow-lg" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/profile/${post.author?._id}`}
            className="inline-flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-full"
          >
            {post.author?.profilePicture ? (
              <img
                src={post.author.profilePicture}
                alt={post.author?.name || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Avatar
                initials={getInitials(post.author?.name)}
                color={getAvatarColor(post.author?.name)}
                size={40}
              />
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${post.author?._id}`}
                className="block max-w-[200px] truncate font-semibold text-black hover:underline"
              >
                {post.author?.name || "Unknown"}
              </Link>

            </div>

            <p className="text-sm text-gray-500 truncate">Software Engineer</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {user?._id && post.author?._id && user._id !== post.author._id && (
            <button
              type="button"
              onClick={() => onToggleFollow?.(post.author._id)}
              disabled={followLoading}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isFollowing
                  ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                  : "border-brand bg-brand text-white hover:bg-brand-hover"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {followLoading ? "..." : t(isFollowing ? "Following" : "Follow")}
            </button>
          )}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-gray-100"
            onClick={() => setShowMenu((previous) => !previous)}
            aria-label={t("Post options")}
            aria-expanded={showMenu}
          >
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className={`absolute right-0 mt-2 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-xl z-30 ${groupPost ? "max-h-[min(70vh,420px)] overflow-y-auto" : ""}`}>
              {groupPost ? (
                <>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50" onClick={handleSavePost}><Bookmark size={17} />{savedState ? "Remove from saved" : "Save"}</button>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50" onClick={() => { setShowMenu(false); copyPostLink(); }}><LinkIcon size={17} />Copy link to post</button>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50" onClick={() => { setShowMenu(false); onRecommendPost?.(post); }}><Bell size={17} />Recommend this post</button>
                  {isOwner && <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50" onClick={() => openEditPost(post.video?.url ? "Edit caption" : "Edit post")}><Pencil size={17} />{post.video?.url ? "Edit caption" : "Edit post"}</button>}
                  {isOwner && <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50" onClick={openPostDeleteModal}><Trash2 size={17} />Delete post</button>}
                  {(isOwner || groupIsOwner) && <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50" onClick={() => { setShowMenu(false); onToggleComments?.(post._id); }}><MessageSquareOff size={17} />{post.commentsDisabled ? "Enable comments" : "Disable comments"}</button>}
                </>
              ) : (
                <>
                  {isOwner ? (
                    <>
                      <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={() => openEditPost("Edit Post")}>{t("Edit")}</button>
                          <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={openPostDeleteModal}>{t("Delete")}</button>
                    </>
                  ) : (
                    <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { setShowMenu(false); onToggleFollow?.(post.author._id); }} disabled={followLoading}>{t(isFollowing ? "Unfollow" : "Follow")}</button>
                  )}
                  <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={handleSavePost}>{t(savedState ? "Remove from saved" : "Save post")}</button>
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { setShowMenu(false); openSendModal(); }}>{t("Send in a message")}</button>
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { setShowMenu(false); copyPostLink(); }}>{t("Copy link")}</button>
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { setShowMenu(false); onDismiss?.(post._id, "not-interested"); }}>{t("Not interested")}</button>
                  {!isOwner && <button type="button" className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={() => { setShowMenu(false); setReportReason("spam"); setReportDetails(""); setShowReportModal(true); }}><Flag size={14} />Report post</button>}
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss?.(post._id, "dismiss")}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Hide post"
          title="Hide post"
        >
          <X size={19} />
        </button>
        </div>
      </div>

      {isRepost && (
        <p className="mt-3 text-xs font-medium text-gray-500">
          {post.author?.name || "Someone"} reposted this
        </p>
      )}

      <div className={isRepost ? "mt-2 rounded-lg border border-gray-200 p-3" : "mt-3"}>
        {isRepost && (
          <p className="text-xs font-medium text-gray-500">
            Originally posted by {originalPost.author?.name || "Unknown"}
          </p>
        )}

        {originalPost.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"><PostText text={originalPost.text} /></p>}

        {originalPost.event && <EventPostAttachment event={originalPost.event} />}

        {pollState?.question && (
          <section className="mt-4 rounded-xl border border-gray-200 p-4" aria-label="Post poll">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900"><BarChart3 size={18} className="text-brand" />{pollState.question}</h3>
            <div className="mt-3 space-y-2">
              {pollState.options.map((option) => {
                const votes = option.votes?.length || 0;
                const totalVotes = pollState.options.reduce((count, item) => count + (item.votes?.length || 0), 0);
                const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                const selected = option.votes?.some((voter) => (voter?._id || voter)?.toString() === viewerId);
                return (
                  <button
                    key={option._id}
                    type="button"
                    disabled={pollClosed || pollSubmitting || pollHasVoted}
                    onClick={() => submitPollVote(option._id)}
                    className={`relative flex min-h-11 w-full items-center justify-between overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-brand" : "border-gray-300"} disabled:cursor-default`}
                  >
                    {(pollHasVoted || pollClosed) && <span className="absolute inset-y-0 left-0 bg-sky/70 transition-all" style={{ width: `${percentage}%` }} />}
                    <span className="relative z-[1] flex items-center gap-2"><span>{option.text}</span>{selected && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">Your vote</span>}</span>
                    {(pollHasVoted || pollClosed) && <span className="relative z-[1] font-medium">{percentage}%</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500">{pollState.options.reduce((count, item) => count + (item.votes?.length || 0), 0)} votes · {pollClosed ? "Poll closed" : pollState.expiresAt ? `Ends ${new Date(pollState.expiresAt).toLocaleDateString()}` : "No end date"}</p>
          </section>
        )}

        {originalPost.image?.url && !originalPost.video?.url && (
          <img
            src={originalPost.image.url}
            alt={`Image shared by ${originalPost.author?.name || "the author"}`}
            className="mt-3 w-full max-h-[400px] rounded-lg object-cover"
          />
        )}

        {originalPost.video?.url && (
          <video
            src={originalPost.video.url}
            controls
            preload="metadata"
            aria-label={`Video shared by ${originalPost.author?.name || "the author"}`}
            className="w-full max-h-[600px] object-contain"
          />
        )}

      </div>

      <div className="mt-3 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:justify-between">
        <div>{post.likes?.length || 0} Likes</div>
        <div className="flex items-center gap-3">
          {post.reactions?.length > 0 && <span>{post.reactions.length} Reactions</span>}
          <span>{commentCount || 0} Comments</span>
        </div>
      </div>

      <hr className="my-3" />

      <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2 text-xs sm:justify-between">
        <div className="relative order-5" ref={reactionPickerRef}>
          <button
            type="button"
            className={`relative grid h-9 min-w-9 place-items-center rounded-full px-2 ${currentReaction ? "text-brand" : "text-gray-600"} hover:bg-gray-100`}
            onClick={() => setShowReactionPicker((previous) => !previous)}
            aria-label="React to post"
          >
            <Smile size={18} />
            {currentReaction && (
              <span className="absolute -right-1 -top-1 text-xs leading-none" aria-hidden="true">
                {currentReaction}
              </span>
            )}
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-full right-0 z-20 mb-2 flex gap-1 rounded-full border border-gray-200 bg-white p-2 shadow-lg">
              {reactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-gray-100 ${currentReaction === emoji ? "bg-sky" : ""}`}
                  onClick={() => {
                    onReact?.(post._id, emoji);
                    setShowReactionPicker(false);
                  }}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={`order-1 flex items-center gap-2 rounded px-3 py-2 ${
            isLiked ? "font-semibold text-blue-600" : ""
          }`}
          onClick={() => onLike(post._id)}
          disabled={liking}
        >
          <ThumbsUp size={16} className={isLiked ? "fill-blue-600" : ""} />

          <span className="hidden sm:inline">
            {liking ? "..." : t(isLiked ? "Liked" : "Like")}
          </span>
        </button>

        <button
          type="button"
          className="order-3 flex items-center gap-2 rounded px-3 py-2"
          onClick={openSendModal}
          aria-label={t("Share post")}
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">{t("Share")}</span>
        </button>

        <button
          type="button"
          className="order-2 flex items-center gap-2 rounded px-3 py-2"
          onClick={() => {
            if (post.commentsDisabled) return;
            if (!showComments) {
              fetchComments();
            }

            setShowComments(!showComments);
          }}
          disabled={post.commentsDisabled}
          title={post.commentsDisabled ? t("Comments are disabled for this post") : undefined}
        >
          <MessageCircle size={16} />
          <span className="hidden sm:inline">{t(post.commentsDisabled ? "Comments off" : "Comment")}</span>
        </button>

        <button
          className="order-4 flex items-center gap-2 rounded px-3 py-2 disabled:opacity-60"
          onClick={() => onRepost?.(post._id)}
          disabled={reposting || post.author?._id === user?._id}
        >
          <Repeat2 size={16} />
          <span className="hidden sm:inline">{t(reposting ? "Reposting..." : "Repost")}</span>
        </button>

      </div>

      {showComments &&
        (loadingComments ? (
          <p className="mt-3 text-sm text-gray-500">{t("Loading comments...")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {post.commentsDisabled && <p className="text-xs text-muted-ink">{t("Comments are disabled for this post.")}</p>}
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">{t("No comments yet")}</p>
            ) : (
              comments.map((comment) => {
                const isCommentOwner = user?._id === comment.author?._id;
                return (
                  <div
                    key={comment._id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex gap-3 flex-1">
                      {comment.author?.profilePicture ? (
                        <img
                          src={comment.author.profilePicture}
                          alt=""
                          className="h-9 w-9 rounded-full"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full">
                          <Avatar
                            initials={getInitials(comment.author?.name)}
                            color={getAvatarColor(comment.author?.name)}
                            size={36}
                          />
                        </div>
                      )}

                      <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2">
                        <h4 className="text-sm font-semibold">
                          {comment.author?.name}
                        </h4>

                        <p className="text-sm">{comment.text}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        className="rounded-full p-1 hover:bg-gray-100"
                        onClick={() =>
                          setActiveCommentMenu(
                            activeCommentMenu === comment._id
                              ? null
                              : comment._id,
                          )
                        }
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeCommentMenu === comment._id && (
                        <div className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                          {isCommentOwner && (
                            <button
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => openDeleteModal(comment._id)}
                              disabled={deletingCommentId === comment._id}
                            >
                              {deletingCommentId === comment._id
                                ? t("Deleting...")
                                : t("Delete")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {!post.commentsDisabled && <div className="mt-4 flex items-start gap-3 border-t pt-4">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full">
                  <Avatar
                    initials={getInitials(user?.name)}
                    color={getAvatarColor(user?.name)}
                    size={40}
                  />
                </div>
              )}

              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("Add a comment...")}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500"
                />

                <div className="mt-2 flex justify-end">
                  <button
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleCreateComment}
                    disabled={isCreatingComment}
                  >
                    {isCreatingComment ? t("Posting...") : t("Post")}
                  </button>
                </div>
              </div>
            </div>}
          </div>
        ))}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">
              Delete comment?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. Are you sure you want to delete this
              comment?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={confirmDeleteComment}
                disabled={deletingCommentId !== null}
              >
                {deletingCommentId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">
              Delete post?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. Are you sure you want to delete this
              post?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={closePostDeleteModal}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={confirmDeletePost}
                disabled={isDeletingPost}
              >
                {isDeletingPost ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReportModal && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !reporting) setShowReportModal(false); }}>
          <form onSubmit={submitPostReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Report post</h2>
            <p className="mt-1 text-sm text-gray-500">Reports are recorded for moderator review.</p>
            <label className="mt-4 block text-sm font-medium">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misinformation</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option></select></label>
            <label className="mt-4 block text-sm font-medium">Details (optional)<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></label>
            <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={reporting} onClick={() => setShowReportModal(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={reporting} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{reporting ? "Sending…" : "Send report"}</button></div>
          </form>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Send post</h3>
              <button
                type="button"
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setShowSendModal(false)}
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">People on CareerLink</label>
              <input
                value={sendQuery}
                onChange={(event) => setSendQuery(event.target.value)}
                placeholder="Search people by name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              {selectedSendUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSendUsers.map((person) => (
                    <button
                      key={person._id}
                      type="button"
                      onClick={() =>
                        setSelectedSendUsers((selected) =>
                          selected.filter((item) => item._id !== person._id),
                        )
                      }
                      className="rounded-full bg-sky px-3 py-1 text-xs font-medium text-brand hover:bg-blue-100"
                    >
                      {person.name} ×
                    </button>
                  ))}
                </div>
              )}

              {sendResults.length > 0 && (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded border border-gray-200 p-2">
                  {sendResults.map((person) => (
                    <button
                      key={person._id}
                      type="button"
                      onClick={() =>
                        setSelectedSendUsers((selected) => [...selected, person])
                      }
                      className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{person.name}</p>
                        <p className="text-xs text-gray-500">{person.headline || person.email}</p>
                      </div>
                      <span className="text-sm font-semibold text-brand">Add</span>
                    </button>
                  ))}
                </div>
              )}
              {sendQuery.trim().length >= 2 && sendResults.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No more people found for this search.
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Optional note</label>
              <textarea
                value={sendNote}
                onChange={(event) => setSendNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Add a short note"
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPost}
                disabled={selectedSendUsers.length === 0 || sendingPost}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingPost ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">{editModalTitle}</h3>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={5}
              placeholder="What do you want to say?"
              className="mt-4 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500"
            />

            {!groupPost && editPreview && (
              <div className="mt-4">
                <img
                  src={editPreview}
                  alt="Post preview"
                  className="max-h-64 w-full rounded-lg object-cover"
                />
              </div>
            )}

            {!groupPost && <input
              type="file"
              accept="image/*"
              className="mt-4 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                if (!file.type.startsWith("image/")) {
                  toast.error("Please select an image file");
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Image must be less than 5 MB");
                  return;
                }

                setEditImage(file);
                setEditPreview(URL.createObjectURL(file));
              }}
            />}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleEditPost}
                disabled={isUpdating}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventPostAttachment({ event }) {
  const organizer = event.organizer;
  const attendees = (event.attendees || []).filter((person) => person._id !== organizer?._id);
  const attendeeTotal = attendees.length + (organizer ? 1 : 0);
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const isToday = start.toDateString() === new Date().toDateString();
  const eventTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const dateLabel = `${isToday ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(start)}, ${eventTime.format(start)}${end ? ` - ${eventTime.format(end)}` : ""}`;

  return <article className="mt-3 overflow-hidden rounded-xl border border-gray-200">
    <Link to={`/events/${event._id}`} className="block">
      {event.coverImage?.url
        ? <img src={event.coverImage.url} alt={`Cover for ${event.title}`} className="aspect-video max-h-[400px] w-full object-cover" />
        : <div className="grid aspect-video max-h-[400px] place-items-center bg-gradient-to-br from-sky to-violet-100 text-4xl text-brand">◷</div>}
    </Link>
    <div className="p-4">
      <p className="text-sm font-medium text-emerald-700">{dateLabel}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/events/${event._id}`} className="break-words font-semibold text-ink hover:underline">{event.title}</Link>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-ink">{event.isOnline ? <MonitorPlay size={15} /> : <MapPin size={15} />}{event.isOnline ? "Online" : event.location || "In person"}</p>
          {attendeeTotal > 0 && <div className="mt-2 flex items-center gap-2">
            <span className="flex -space-x-2">{organizer && <ProfileAvatar user={organizer} size={26} />}{attendees.slice(0, 1).map((person) => <ProfileAvatar key={person._id} user={person} size={26} />)}</span>
            <span className="truncate text-xs text-muted-ink">{organizer?.name || "Event host"}{attendeeTotal > 1 ? ` and ${attendeeTotal - 1} other ${attendeeTotal - 1 === 1 ? "attendee" : "attendees"}` : ""}</span>
          </div>}
        </div>
        <Link to={`/events/${event._id}`} className="shrink-0 self-center rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-sky">View event</Link>
      </div>
    </div>
  </article>;
}
