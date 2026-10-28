import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Image as ImageIcon,
  Info,
  Link2,
  MapPin,
  MoreHorizontal,
  Pin,
  Pencil,
  Plus,
  Share2,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import api from "../services/api.js";
import {
  createEvent,
  getEvents,
  getGroup,
  getGroups,
  reviewGroupJoinRequest,
  reviewGroupPost,
  toggleGroupMembership,
  toggleGroupNotifications,
  toggleGroupPostPin,
  updateGroup,
} from "../services/communityServices.js";

const actionClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60";
const blankEvent = { title: "", description: "", startsAt: "", endsAt: "", location: "", isOnline: false, meetingUrl: "" };

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFeedShare, setShowFeedShare] = useState(false);
  const [feedShareText, setFeedShareText] = useState("");
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postVideo, setPostVideo] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollDraft, setPollDraft] = useState({ question: "", options: ["", ""], durationDays: 7 });
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [requestAction, setRequestAction] = useState("");
  const [recentGroups, setRecentGroups] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({ groups: false, events: false });
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventDraft, setEventDraft] = useState(blankEvent);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaPreviewUrlRef = useRef("");

  useEffect(() => () => {
    if (mediaPreviewUrlRef.current) URL.revokeObjectURL(mediaPreviewUrlRef.current);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getGroup(groupId);
      setGroup(data);
      setPosts(data.posts || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this group");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let active = true;
    Promise.all([getGroups(), getEvents()])
      .then(([groups, events]) => {
        if (!active) return;
        setRecentGroups(groups.filter((item) => item.isMember || item.isOwner).slice(0, 3));
        setRecentEvents(events.slice(0, 3));
      })
      .catch(() => {
        if (active) toast.error("Unable to load your recent groups and events");
      });
    return () => { active = false; };
  }, [groupId]);

  const changeMembership = async () => {
    try {
      const result = await toggleGroupMembership(group._id);
      setGroup((current) => ({
        ...current,
        isMember: result.joined,
        isRequested: result.requested || false,
        memberCount: result.memberCount,
      }));
      toast.success(result.requested ? "Join request sent" : result.joined ? "Joined group" : "Left group");
      if (result.joined) load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update membership");
    }
  };

  const createGroupPoll = async (event) => {
    event.preventDefault();
    try {
      setCreatingPoll(true);
      const { data } = await api.post("/posts", {
        groupId: group._id,
        poll: {
          ...pollDraft,
          options: pollDraft.options.map((option) => option.trim()),
        },
      });
      if (data.groupPostStatus === "pending") {
        setGroup((current) => ({ ...current, pendingPostCount: (current.pendingPostCount || 0) + 1 }));
        toast.success("Your poll is waiting for admin review");
      } else {
        setPosts((current) => [data, ...current]);
        setGroup((current) => ({ ...current, postCount: (current.postCount || 0) + 1 }));
        toast.success("Poll shared with the group");
      }
      setPollDraft({ question: "", options: ["", ""], durationDays: 7 });
      setShowPollForm(false);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to create poll");
    } finally {
      setCreatingPoll(false);
    }
  };

  const selectPostMedia = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const maxFileSize = 25 * 1024 * 1024;
    if (file.size > maxFileSize) {
      toast.error("Photo and video files must be 25 MB or smaller");
      return;
    }
    const isSupported = type === "image"
      ? ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
      : ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
    if (!isSupported) {
      toast.error(type === "image"
        ? "Choose a JPG, PNG, WEBP, HEIC, or HEIF photo"
        : "Choose an MP4, WEBM, or MOV video");
      return;
    }
    if (mediaPreviewUrlRef.current) URL.revokeObjectURL(mediaPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    mediaPreviewUrlRef.current = previewUrl;
    setMediaPreviewUrl(previewUrl);
    setShowMediaPreview(false);
    if (type === "image") {
      setPostImage(file);
      setPostVideo(null);
    } else {
      setPostVideo(file);
      setPostImage(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/groups/${group._id}`);
      toast.success("Group link copied");
    } catch {
      toast.error("Unable to copy group link");
    }
    setShowMenu(false);
    setShowShareMenu(false);
  };

  const shareToFeed = async (event) => {
    event.preventDefault();
    if (sharingToFeed) return;
    const groupUrl = `${window.location.origin}/groups/${group._id}`;
    const text = [feedShareText.trim(), `Check out ${group.name} on CareerLink: ${groupUrl}`]
      .filter(Boolean)
      .join("\n\n");
    const form = new FormData();
    form.append("text", text);
    try {
      setSharingToFeed(true);
      const { data } = await api.post("/posts", form);
      if (!data?._id) throw new Error("The post was not returned by the server");
      setShowFeedShare(false);
      setFeedShareText("");
      toast.success("Group shared to your feed");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to share group to your feed");
    } finally {
      setSharingToFeed(false);
      setShowShareMenu(false);
    }
  };

  const clearPostMedia = () => {
    if (mediaPreviewUrlRef.current) URL.revokeObjectURL(mediaPreviewUrlRef.current);
    mediaPreviewUrlRef.current = "";
    setMediaPreviewUrl("");
    setPostImage(null);
    setPostVideo(null);
    setShowMediaPreview(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const createGroupPost = async (event) => {
    event.preventDefault();
    if (!postText.trim() && !postImage && !postVideo) return;
    const hasMedia = Boolean(postImage || postVideo);
    let payload = { text: postText.trim(), groupId: group._id };
    if (hasMedia) {
      const form = new FormData();
      form.append("text", postText.trim());
      form.append("groupId", group._id);
      if (postImage) form.append("image", postImage);
      if (postVideo) form.append("video", postVideo);
      payload = form;
    }
    try {
      setPosting(true);
      const { data } = await api.post("/posts", payload);
      if (!data?._id) throw new Error("The post was not returned by the server");
      if (data.groupPostStatus === "pending") {
        setGroup((current) => ({ ...current, pendingPostCount: (current.pendingPostCount || 0) + 1 }));
        toast.success("Your post is waiting for admin review");
      } else {
        setPosts((current) => [data, ...current]);
        setGroup((current) => ({ ...current, postCount: (current.postCount || 0) + 1 }));
        toast.success("Group post shared");
      }
      setPostText("");
      clearPostMedia();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to create group post");
    } finally {
      setPosting(false);
    }
  };

  const updatePost = (postId, updated) => {
    setPosts((current) => current.map((post) => post._id === postId ? updated : post));
  };
  const handleLike = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/like`);
      updatePost(postId, data);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update reaction");
    }
  };
  const handleReact = async (postId, emoji) => {
    try {
      const { data } = await api.post(`/posts/${postId}/reaction`, { emoji });
      updatePost(postId, data);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update reaction");
    }
  };
  const handleDeletePost = async (postId) => {
    await api.delete(`/posts/${postId}`);
    setPosts((current) => current.filter((post) => post._id !== postId));
    setGroup((current) => ({ ...current, postCount: Math.max(0, current.postCount - 1) }));
  };
  const handleRepost = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/repost`, { groupId: group._id });
      setPosts((current) => [data, ...current]);
      setGroup((current) => ({ ...current, postCount: (current.postCount || 0) + 1 }));
      toast.success("Post reposted to this group");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to repost post");
    }
  };
  const handleSave = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/save`);
      setSavedPostIds((current) => data.saved
        ? [...new Set([...current, postId])]
        : current.filter((id) => id !== postId));
      toast.success(data.saved ? "Post saved" : "Post removed from saved items");
      return data;
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update saved posts");
      throw requestError;
    }
  };
  const handleRecommendPost = async (post) => {
    const postUrl = `${window.location.origin}/groups/${group._id}#post-${post._id}`;
    try {
      await api.post("/posts", {
        text: `I recommend this post from ${group.name}:\n${postUrl}`,
      });
      toast.success("Post recommendation shared to your feed");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to recommend this post");
    }
  };
  const handleTogglePostComments = async (postId) => {
    try {
      const { data } = await api.post(`/posts/${postId}/comments/toggle`);
      setPosts((current) => current.map((post) => post._id === postId
        ? { ...post, commentsDisabled: data.commentsDisabled }
        : post));
      toast.success(data.commentsDisabled ? "Comments disabled" : "Comments enabled");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update post comments");
    }
  };
  const handlePin = async (postId) => {
    try {
      const result = await toggleGroupPostPin(group._id, postId);
      setGroup((current) => ({ ...current, pinnedPostIds: result.pinnedPostIds }));
      toast.success(result.pinned ? "Post pinned to group" : "Post unpinned");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to pin post");
    }
  };
  const handleNotificationsToggle = async () => {
    try {
      const result = await toggleGroupNotifications(group._id);
      setGroup((current) => ({ ...current, notificationsEnabled: result.enabled }));
      toast.success(result.enabled ? "Group notifications enabled" : "Group notifications muted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update group notifications");
    }
  };

  const handleSettingsSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const settingsDraft = { ...draft };
      if (settingsDraft.requirePostApproval === group.requirePostApproval) {
        delete settingsDraft.requirePostApproval;
      }
      const updated = await updateGroup(group._id, settingsDraft);
      setGroup((current) => ({ ...current, ...updated }));
      setShowSettings(false);
      toast.success("Group settings updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update group settings");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinRequest = async (personId, action) => {
    try {
      setRequestAction(personId);
      await reviewGroupJoinRequest(group._id, personId, action);
      setGroup((current) => ({
        ...current,
        requestedMembers: current.requestedMembers.filter((person) => person._id !== personId),
        joinRequestCount: Math.max(0, current.joinRequestCount - 1),
        members: action === "approve"
          ? [...current.members, current.requestedMembers.find((person) => person._id === personId)]
          : current.members,
        memberCount: action === "approve" ? current.memberCount + 1 : current.memberCount,
      }));
      toast.success(action === "approve" ? "Member approved" : "Request declined");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update join request");
    } finally {
      setRequestAction("");
    }
  };
  const handleReviewPost = async (postId, action) => {
    try {
      await reviewGroupPost(group._id, postId, action);
      setPosts((current) => action === "approve"
        ? current.map((post) => post._id === postId ? { ...post, groupPostStatus: "approved" } : post)
        : current.filter((post) => post._id !== postId));
      setGroup((current) => ({
        ...current,
        pendingPostCount: Math.max(0, (current.pendingPostCount || 0) - 1),
        postCount: action === "approve" ? (current.postCount || 0) + 1 : current.postCount,
      }));
      toast.success(action === "approve" ? "Post approved" : "Post declined");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to review group post");
    }
  };
  const submitEvent = async (event) => {
    event.preventDefault();
    try {
      setCreatingEvent(true);
      const created = await createEvent(eventDraft);
      setRecentEvents((current) => [{ ...created, attendeeCount: 1, isAttending: true }, ...current].slice(0, 3));
      setEventDraft(blankEvent);
      setShowEventForm(false);
      toast.success("Event created");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#f3f2ef] px-4 py-8"><Card className="mx-auto max-w-5xl p-8 text-center text-sm text-muted-ink">Loading group…</Card></div>;
  if (error || !group) return <div className="min-h-screen bg-[#f3f2ef] px-4 py-8"><Card className="mx-auto max-w-3xl p-8 text-center"><p role="alert" className="text-sm text-red-600">{error || "Group not found"}</p><Link to="/groups" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Back to groups</Link></Card></div>;

  const owner = group.owner || {};
  const members = group.members || [];
  const admins = [owner, ...(group.admins || [])].filter((admin, index, list) =>
    admin?._id && list.findIndex((item) => item?._id === admin._id) === index,
  );

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-3 py-5 sm:px-5">
      <div className="mx-auto grid max-w-[1128px] items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="space-y-3">
          <Card className="overflow-hidden text-center">
            {owner.coverPicture
              ? <img src={owner.coverPicture} alt="" className="h-16 w-full object-cover" />
              : <div className="h-16 bg-gradient-to-r from-[#0f5660] via-[#2a8e93] to-[#d0c2e2]" />}
            <div className="-mt-7 px-4 pb-3">
              <ProfileAvatar user={owner} size={58} className="mx-auto border-2 border-white" />
              <Link to={`/profile/${owner._id}`} className="mt-2 block truncate text-sm font-semibold text-ink hover:underline">{owner.name || "Group owner"}</Link>
              <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{group.isOwner ? "Owner" : "Admin"}</span>
              <p className="mt-1 text-[11px] text-muted-ink">Group created: {new Date(group.createdAt).toLocaleDateString([], { month: "short", year: "numeric" })}</p>
            </div>
            {group.isOwner && <div className="border-t border-gray-100">
              <div className="space-y-2 border-b border-gray-100 px-4 py-3 text-left text-xs text-muted-ink">
                <p className="flex items-center justify-between"><span>Pending posts</span><button type="button" onClick={() => document.querySelector("[data-pending-group-post='true']")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="font-semibold text-brand hover:underline">{group.pendingPostCount || 0}</button></p>
                <p className="flex items-center justify-between"><span>Requests to join</span><button type="button" onClick={() => setShowMembers(true)} className="font-semibold text-brand hover:underline">{group.joinRequestCount || 0}</button></p>
              </div>
              <button type="button" onClick={() => navigate(`/groups/${group._id}/manage`)} className="w-full border-b border-gray-100 px-4 py-3 text-xs font-semibold text-ink hover:bg-gray-50">Manage group</button>
              <button type="button" onClick={() => { setDraft({ ...group, image: null }); setShowSettings(true); }} className="w-full px-4 py-3 text-xs font-semibold text-ink hover:bg-gray-50">Edit group</button>
            </div>}
          </Card>
          <Card className="overflow-hidden p-4">
            <h2 className="text-xs font-semibold text-muted-ink">Recent</h2>
            <Link to={`/groups/${group._id}`} className="mt-3 flex items-center gap-2 truncate text-xs text-ink hover:text-brand"><UsersRound size={16} className="shrink-0" />{group.name}</Link>
            {recentEvents.slice(0, 1).map((event) => <Link key={event._id} to={`/events#event-${event._id}`} className="mt-2 flex items-center gap-2 truncate text-xs text-ink hover:text-brand"><CalendarDays size={15} className="shrink-0" />{event.title}</Link>)}
            <section className="mt-5">
              <div className="flex items-center justify-between">
                <Link to="/groups" className="text-sm font-medium text-brand underline hover:text-brand-hover">Groups</Link>
                <button type="button" aria-label={collapsedSections.groups ? "Expand groups" : "Collapse groups"} aria-expanded={!collapsedSections.groups} onClick={() => setCollapsedSections((current) => ({ ...current, groups: !current.groups }))} className="grid h-7 w-7 place-items-center rounded-full text-muted-ink hover:bg-gray-100">{collapsedSections.groups ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button>
              </div>
              {!collapsedSections.groups && <div className="mt-2 space-y-2">
                {(recentGroups.some((item) => item._id === group._id) ? recentGroups : [{ ...group, isMember: true }, ...recentGroups]).slice(0, 3).map((item) => <Link key={item._id} to={`/groups/${item._id}`} className="flex min-w-0 items-center gap-2 rounded-md py-1 text-xs text-ink hover:text-brand"><UsersRound size={16} className="shrink-0" /><span className="truncate">{item.name}</span></Link>)}
                <Link to="/groups" className="ml-6 inline-block pt-1 text-xs text-muted-ink hover:text-brand">See all</Link>
              </div>}
            </section>
            <section className="mt-4 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <Link to="/events" className="text-sm font-medium text-brand underline hover:text-brand-hover">Events</Link>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { setEventDraft(blankEvent); setShowEventForm(true); }} aria-label="Create event" title="Create event" className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-gray-100"><Plus size={20} /></button>
                  <button type="button" aria-label={collapsedSections.events ? "Expand events" : "Collapse events"} aria-expanded={!collapsedSections.events} onClick={() => setCollapsedSections((current) => ({ ...current, events: !current.events }))} className="grid h-7 w-7 place-items-center rounded-full text-muted-ink hover:bg-gray-100">{collapsedSections.events ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button>
                </div>
              </div>
              {!collapsedSections.events && <div className="mt-2 space-y-2">
                {recentEvents.length ? recentEvents.slice(0, 3).map((event) => <Link key={event._id} to={`/events#event-${event._id}`} className="flex min-w-0 items-center gap-2 rounded-md py-1 text-xs text-ink hover:text-brand"><CalendarDays size={15} className="shrink-0" /><span className="truncate">{event.title}</span></Link>) : <p className="py-1 text-xs text-muted-ink">No upcoming events.</p>}
                <Link to="/events" className="ml-6 inline-block pt-1 text-xs text-muted-ink hover:text-brand">See all</Link>
              </div>}
              <Link to="/network/pages/discover" className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-brand hover:text-brand-hover">
                <span>Discover more</span>
                <span aria-hidden="true">→</span>
              </Link>
            </section>
          </Card>
        </aside>

        <main className="min-w-0 space-y-3">
          <Card className="relative z-30 overflow-visible">
            <div className="relative h-28 overflow-hidden sm:h-36">
              {group.coverImage?.url
                ? <img src={group.coverImage.url} alt="" className="h-full w-full object-cover" />
                : <div className="h-full bg-[radial-gradient(circle_at_75%_50%,rgba(111,77,151,.35)_0_17%,transparent_17.5%),radial-gradient(circle_at_98%_48%,rgba(111,77,151,.28)_0_18%,transparent_18.5%),linear-gradient(90deg,#d9cde7_0_50%,#eee8f3_50%)]" />}
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <div className="relative -mt-9 flex flex-wrap items-end justify-between gap-3">
                {group.image?.url
                  ? <img src={group.image.url} alt="" className="relative z-10 h-[68px] w-[68px] shrink-0 rounded-xl border-2 border-white object-cover shadow-md" />
                  : <div className="relative z-10 grid h-[68px] w-[68px] shrink-0 place-items-center rounded-xl border-2 border-white bg-sky text-brand shadow-md"><UsersRound size={30} /></div>}
                <div className="relative z-20 flex translate-y-5 flex-wrap items-center justify-end gap-2 pb-1">
                  <button type="button" title="About this group" aria-label="About this group" onClick={() => setShowAbout(true)} className="grid h-10 w-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><Info size={19} /></button>
                  <div className="relative">
                    <button type="button" aria-label="Share group" aria-expanded={showShareMenu} onClick={() => { setShowShareMenu((value) => !value); setShowMenu(false); }} title="Share group" className="grid h-10 w-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><Share2 size={19} /></button>
                    {showShareMenu && <div className="absolute right-0 top-11 z-[100] w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                      {group.isMember && <button type="button" onClick={() => { setShowFeedShare(true); setShowShareMenu(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Share2 size={17} />Share to your feed</button>}
                      <button type="button" onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Copy size={17} />Copy group link</button>
                    </div>}
                  </div>
                  {group.isMember && <button type="button" title={group.notificationsEnabled ? "Turn off group notifications" : "Turn on group notifications"} aria-label={group.notificationsEnabled ? "Turn off group notifications" : "Turn on group notifications"} aria-pressed={group.notificationsEnabled} onClick={handleNotificationsToggle} className={`grid h-10 w-10 place-items-center rounded-full hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${group.notificationsEnabled ? "text-brand" : "text-gray-600"}`}><Bell size={19} className={group.notificationsEnabled ? "fill-current" : ""} /></button>}
                  {group.isOwner && <button type="button" title="Edit group" aria-label="Edit group" onClick={() => { setDraft({ ...group, image: null }); setShowSettings(true); }} className="grid h-10 w-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><Pencil size={19} /></button>}
                  <button type="button" aria-label="Group options" aria-expanded={showMenu} onClick={() => { setShowMenu((value) => !value); setShowShareMenu(false); }} className="grid h-10 w-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><MoreHorizontal size={21} /></button>
                  {showMenu && <div className="absolute right-0 top-12 z-[100] max-h-[min(70dvh,24rem)] w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                    <button type="button" onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Link2 size={17} />Copy link to group</button>
                    {group.isOwner && <button type="button" onClick={() => { setDraft({ ...group, image: null }); setShowSettings(true); setShowMenu(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Pencil size={17} />Update your settings</button>}
                    {group.isOwner
                      ? <div className="px-4 py-3 text-sm text-gray-400" title="Owners cannot leave their own group">Owner cannot leave</div>
                      : group.isMember
                        ? <button type="button" onClick={changeMembership} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50">Leave this group</button>
                        : <button type="button" onClick={changeMembership} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50">{group.isRequested ? "Cancel join request" : "Request to join"}</button>}
                  </div>}
                </div>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-ink">{group.name}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink"><UsersRound size={16} />{group.privacy === "private" ? "Private" : "Public"} group <span className="text-muted-ink">· {group.memberCount} members</span></p>
              <button type="button" onClick={() => setShowAbout(true)} className="mt-3 text-sm font-semibold text-brand hover:underline">About this group</button>
            </div>
          </Card>

          {!group.isMember && !group.isOwner ? (
            <Card className="p-7 text-center">
              <h2 className="font-semibold text-ink">{group.isRequested ? "Your request is pending" : "Join this group to see and share posts"}</h2>
              <p className="mt-2 text-sm text-muted-ink">{group.isRequested ? "The group owner will review your request." : "Become a member to take part in the discussion."}</p>
              <button type="button" onClick={changeMembership} className={`${actionClass} mt-4 border border-brand text-brand hover:bg-sky`}>{group.isRequested ? "Cancel request" : group.joinApprovalMode === "approval" || (group.privacy === "private" && !group.joinApprovalMode) ? "Request to join" : "Join group"}</button>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <form onSubmit={createGroupPost}>
                  <div className="flex items-start gap-3">
                    <ProfileAvatar user={owner} size={42} />
                    <textarea value={postText} onChange={(event) => setPostText(event.target.value)} maxLength={1000} rows={2} placeholder="Start a public post" className="min-h-11 flex-1 resize-y rounded-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand" />
                  </div>
                  {(postImage || postVideo) && <div className="ml-14 mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                    {postImage && mediaPreviewUrl && <img src={mediaPreviewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                    {postVideo && <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gray-200 text-gray-600"><Video size={24} /></div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{postImage?.name || postVideo?.name}</p><p className="text-xs text-muted-ink">{postVideo ? "Video ready to post" : "Photo ready to post"}</p></div>
                    <button type="button" onClick={() => setShowMediaPreview(true)} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold text-brand hover:bg-white"><Eye size={16} />Preview</button>
                    <button type="button" onClick={clearPostMedia} aria-label="Remove selected media" title="Remove selected media" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-white hover:text-red-600"><X size={18} /></button>
                  </div>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => selectPostMedia(event, "image")} />
                    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => selectPostMedia(event, "video")} />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-ink hover:bg-gray-50"><ImageIcon size={18} className="text-blue-600" />Photo</button>
                      <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-ink hover:bg-gray-50"><Video size={18} className="text-emerald-700" />Video</button>
                      <button type="button" onClick={() => { if (postImage || postVideo) { toast.error("A poll cannot be combined with a photo or video"); return; } setPollDraft({ question: "", options: ["", ""], durationDays: 7 }); setShowPollForm(true); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-ink hover:bg-gray-50"><BarChart3 size={18} className="text-violet-600" />Poll</button>
                    </div>
                    <button type="submit" disabled={posting || (!postText.trim() && !postImage && !postVideo)} className={`${actionClass} bg-brand text-white hover:bg-brand-hover`}>{posting ? "Posting…" : "Post"}</button>
                  </div>
                </form>
              </Card>
              <div className="flex gap-2">
                <button type="button" className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white">All</button>
                <button type="button" onClick={() => toast("Recommended group posts are not available yet")} className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-ink hover:bg-white">Recommended</button>
              </div>
              {posts.length ? [...posts].sort((a, b) => Number(group.pinnedPostIds?.includes(b._id)) - Number(group.pinnedPostIds?.includes(a._id))).map((post) => (
                <div key={post._id} data-pending-group-post={post.groupPostStatus === "pending" ? "true" : undefined}>
                  {post.groupPostStatus === "pending" && group.isOwner && <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-amber-200 bg-amber-50 px-4 py-2"><span className="text-xs font-medium text-amber-900">Pending admin review</span><div className="flex gap-2"><button type="button" onClick={() => handleReviewPost(post._id, "approve")} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Approve</button><button type="button" onClick={() => handleReviewPost(post._id, "reject")} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs">Decline</button></div></div>}
                  {group.pinnedPostIds?.includes(post._id) ? (
                    <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-ink"><Pin size={14} className="fill-current" />Pinned by admin</span>
                      {group.isOwner && <button type="button" onClick={() => handlePin(post._id)} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50">Unpin</button>}
                    </div>
                  ) : group.isOwner && <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-2">
                    <span className="text-xs text-muted-ink">Highlight this post by pinning it at the top.</span>
                    <button type="button" onClick={() => handlePin(post._id)} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50">Pin this post</button>
                  </div>}
                  <PostCard
                    post={post}
                    groupPost
                    groupIsOwner={group.isOwner}
                    onDelete={handleDeletePost}
                    onLike={handleLike}
                    onEdit={(updated) => updatePost(post._id, updated)}
                    onRepost={handleRepost}
                    onReact={handleReact}
                    onToggleSave={handleSave}
                    saved={savedPostIds.includes(post._id)}
                    onRecommendPost={handleRecommendPost}
                    onToggleComments={handleTogglePostComments}
                  />
                  <div className="-mt-px flex items-center justify-between gap-3 rounded-b-xl border border-gray-200 bg-white px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-ink"><BarChart3 size={15} />{Number(post.impressions || 0).toLocaleString()} impressions</span>
                    {post.author?._id === group.currentUserId && <Link to={`/groups/${group._id}/posts/${post._id}/analytics`} className="text-xs font-semibold text-brand underline-offset-2 hover:underline">View analytics</Link>}
                  </div>
                </div>
              )) : <Card className="p-8 text-center text-sm text-muted-ink">No posts yet. Start the conversation.</Card>}
            </>
          )}
        </main>

        <aside className="space-y-3">
          <Card className="overflow-hidden">
            <div className="p-4"><h2 className="text-sm font-semibold text-ink">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</h2><div className="mt-3 flex flex-wrap gap-2">{members.slice(0, 8).map((person) => <Link key={person._id} to={`/profile/${person._id}`} title={person.name}><ProfileAvatar user={person} size={42} /></Link>)}</div>{group.isMember && (group.allowMemberInvites || group.isOwner) && <Link to="/network/connections" className={`${actionClass} mt-4 bg-brand text-white hover:bg-brand-hover`}>Invite connections</Link>}</div>
            <button type="button" onClick={() => group.isOwner ? navigate(`/groups/${group._id}/manage?tab=Membership&memberTab=Members`) : setShowMembers(true)} className="w-full border-t border-gray-100 py-3 text-sm font-medium text-ink hover:bg-gray-50">Show all →</button>
          </Card>
          {group.isOwner && <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">Analytics</h2><p className="text-[11px] text-muted-ink">Group activity</p>
            <Metric value="0" label="Active members" />
            <Metric value={group.memberCount} label="Members" />
            <Metric value={group.postCount} label="Posts" />
            <Metric value="0" label="Post views" />
            <button type="button" onClick={() => navigate(`/groups/${group._id}/manage?tab=Analytics&section=Growth`)} className="mt-3 w-full border-t border-gray-100 pt-3 text-sm font-medium text-ink hover:text-brand">Manage group →</button>
          </Card>}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">Admin{admins.length === 1 ? "" : "s"}</h2>
            <div className="mt-3 space-y-4">{admins.map((admin) => {
              const isOwner = admin._id === owner._id;
              return <Link key={admin._id} to={`/profile/${admin._id}`} className="flex items-center gap-3 rounded-lg hover:bg-gray-50">
                <ProfileAvatar user={admin} size={48} />
                <div className="min-w-0"><p className="break-words text-sm font-medium text-ink">{admin.name || "Group admin"}</p><p className="mt-0.5 text-xs text-muted-ink">{admin.headline || "CareerLink member"}</p><span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{isOwner ? "Owner" : "Admin"}</span></div>
              </Link>;
            })}</div>
          </Card>
        </aside>
      </div>

      {showPollForm && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingPoll) setShowPollForm(false); }}><form onSubmit={createGroupPoll} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 className="text-xl font-semibold text-gray-900">Create a poll</h2><button type="button" disabled={creatingPoll} onClick={() => setShowPollForm(false)} aria-label="Close poll form" className="grid h-9 w-9 place-items-center rounded-full text-gray-700 hover:bg-gray-100"><X size={23} /></button></header><div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7"><label className="block text-sm text-gray-700">Your question*<textarea required maxLength={140} autoFocus value={pollDraft.question} onChange={(event) => setPollDraft((current) => ({ ...current, question: event.target.value }))} placeholder="E.g., How do you commute to work?" rows={2} className="mt-1 w-full resize-y rounded-md border border-gray-400 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black" /><span className="mt-1 block text-right text-xs text-gray-500">{pollDraft.question.length}/140</span></label><div className="space-y-4">{pollDraft.options.map((option, index) => <label key={index} className="block text-sm text-gray-700">Option {index + 1}*<span className="mt-1 flex items-center gap-2"><input required maxLength={30} value={option} onChange={(event) => setPollDraft((current) => ({ ...current, options: current.options.map((item, optionIndex) => optionIndex === index ? event.target.value : item) }))} placeholder={index === 0 ? "E.g., Public transportation" : index === 1 ? "E.g., Drive myself" : `Option ${index + 1}`} className="min-w-0 flex-1 rounded-md border border-gray-400 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black" />{index > 1 && <button type="button" onClick={() => setPollDraft((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index) }))} aria-label={`Remove option ${index + 1}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100"><X size={17} /></button>}</span><span className="mt-1 block text-right text-xs text-gray-500">{option.length}/30</span></label>)}</div>{pollDraft.options.length < 4 && <button type="button" onClick={() => setPollDraft((current) => ({ ...current, options: [...current.options, ""] }))} className="inline-flex items-center gap-2 rounded-full border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Plus size={17} />Add option</button>}<label className="block text-sm font-medium text-gray-800">Poll duration<select value={pollDraft.durationDays} onChange={(event) => setPollDraft((current) => ({ ...current, durationDays: Number(event.target.value) }))} className="mt-2 w-full rounded-md border border-gray-400 bg-white px-3 py-2.5 text-base outline-none focus:border-black"><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>1 week</option><option value={14}>2 weeks</option></select></label><p className="text-sm leading-5 text-gray-600">For everyone’s safety, please avoid asking for sensitive personal information.</p></div><footer className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 sm:px-7"><button type="button" disabled={creatingPoll} onClick={() => setShowPollForm(false)} className="rounded-full border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Back</button><button type="submit" disabled={creatingPoll || !pollDraft.question.trim() || pollDraft.options.length < 2 || pollDraft.options.some((option) => !option.trim())} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{creatingPoll ? "Creating…" : "Done"}</button></footer></form></div>}
      {showMembers && <Dialog title={group.isOwner ? "Manage group" : "Group members"} onClose={() => setShowMembers(false)}>
        {group.isOwner && group.requestedMembers?.length > 0 && <section className="mb-5"><h3 className="mb-2 text-sm font-semibold">Requests to join ({group.requestedMembers.length})</h3>{group.requestedMembers.map((person) => <div key={person._id} className="flex items-center gap-3 border-t border-gray-100 py-3"><ProfileAvatar user={person} size={40} /><span className="min-w-0 flex-1 truncate text-sm">{person.name}</span><button type="button" disabled={requestAction === person._id} onClick={() => handleJoinRequest(person._id, "approve")} className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"><Check size={14} className="inline" /> Approve</button><button type="button" disabled={requestAction === person._id} onClick={() => handleJoinRequest(person._id, "decline")} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs">Decline</button></div>)}</section>}
        <h3 className="mb-2 text-sm font-semibold">Members ({members.length})</h3>
        {members.map((person) => <div key={person._id} className="flex items-center gap-3 border-t border-gray-100 py-3"><ProfileAvatar user={person} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="truncate text-xs text-muted-ink">{person.headline || "CareerLink member"}</p></div>{person._id === owner._id && <span className="text-xs text-muted-ink">Owner</span>}</div>)}
      </Dialog>}
      {showAbout && <Dialog title="About this group" onClose={() => setShowAbout(false)}>
        <section className="space-y-5">
          <div><h3 className="text-sm font-semibold text-ink">Description</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-ink">{group.description || "No group description has been added yet."}</p></div>
          <div><h3 className="text-sm font-semibold text-ink">Details</h3><dl className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 px-3">
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-ink">Group type</dt><dd className="font-medium capitalize text-ink">{group.privacy}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-ink">Industry</dt><dd className="font-medium text-ink">{group.category || "Professional"}</dd></div>
            {group.location && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="inline-flex items-center gap-2 text-muted-ink"><MapPin size={15} />Location</dt><dd className="text-right font-medium text-ink">{group.location}</dd></div>}
            <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-ink">Members</dt><dd className="font-medium text-ink">{Number(group.memberCount || 0).toLocaleString()}</dd></div>
            {group.createdAt && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-ink">Created</dt><dd className="font-medium text-ink">{new Date(group.createdAt).toLocaleDateString()}</dd></div>}
          </dl></div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Group rules</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-ink">{group.rules || "No group rules have been added yet."}</p>
          </div>
        </section>
      </Dialog>}
      {showFeedShare && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-3 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !sharingToFeed) setShowFeedShare(false); }}>
        <form onSubmit={shareToFeed} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <header className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink">Share to your feed</h2><button type="button" disabled={sharingToFeed} onClick={() => setShowFeedShare(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button></header>
          <label className="block text-sm font-medium text-ink">Add a note (optional)<textarea value={feedShareText} onChange={(event) => setFeedShareText(event.target.value)} maxLength={850} rows={4} placeholder="What would you like to say about this group?" className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
          <div className="rounded-xl border border-gray-200 p-4"><p className="font-semibold text-ink">{group.name}</p><p className="mt-1 text-xs capitalize text-muted-ink">{group.privacy} group · {group.memberCount} members</p><p className="mt-2 break-all text-sm text-brand">{window.location.origin}/groups/{group._id}</p></div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={sharingToFeed} onClick={() => setShowFeedShare(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={sharingToFeed} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{sharingToFeed ? "Sharing…" : "Post"}</button></div>
        </form>
      </div>}
      {showMediaPreview && (postImage || postVideo) && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowMediaPreview(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Selected media preview" className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3"><div className="min-w-0"><h2 className="text-sm font-semibold text-ink">{postImage ? "Photo preview" : "Video preview"}</h2><p className="truncate text-xs text-muted-ink">{postImage?.name || postVideo?.name}</p></div><button type="button" onClick={() => setShowMediaPreview(false)} aria-label="Close preview" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button></header>
          <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-gray-950 p-2 sm:p-4">{postImage ? <img src={mediaPreviewUrl} alt={postImage.name} className="max-h-[75dvh] max-w-full object-contain" /> : <video src={mediaPreviewUrl} controls playsInline className="max-h-[75dvh] max-w-full" />}</div>
        </section>
      </div>}
      {showSettings && draft && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-3 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowSettings(false); }}>
        <form onSubmit={handleSettingsSave} className="max-h-[92dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <header className="flex items-center justify-between"><h2 className="text-lg font-semibold">Update group settings</h2><button type="button" onClick={() => setShowSettings(false)} aria-label="Close"><X size={20} /></button></header>
          <label className="block text-sm font-medium">Name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></label>
          <label className="block text-sm font-medium">Description<textarea required maxLength={2000} rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={fieldClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Category<input maxLength={80} value={draft.category || ""} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={fieldClass} /></label>
            <label className="block text-sm font-medium">Location<input maxLength={200} value={draft.location || ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className={fieldClass} /></label>
          </div>
          <label className="block text-sm font-medium">Group rules<textarea maxLength={2000} rows={3} value={draft.rules || ""} onChange={(event) => setDraft({ ...draft, rules: event.target.value })} placeholder="Share expectations for group members" className={fieldClass} /></label>
          <div><label className="block text-sm font-medium">Group type<select value={draft.privacy} onChange={(event) => setDraft({ ...draft, privacy: event.target.value })} className={fieldClass}><option value="public">Public</option><option value="private">Private</option></select><span className="mt-1 block text-xs font-normal text-muted-ink">{draft.privacy === "public" ? "Anyone can see group posts. Only group members can comment and post." : "Only members can see group posts and participate."}</span></label></div>
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold">Group settings</h3>
            <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" disabled={draft.privacy !== "public"} checked={draft.privacy === "public" && draft.showInSearch !== false} onChange={(event) => setDraft({ ...draft, showInSearch: event.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Show this public group in search and discovery</span><span className="mt-1 block text-xs leading-5 text-muted-ink">Private groups are never listed in public group discovery. Members can still find their groups in Your groups.</span></span></label>
            <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(draft.allowMemberInvites ?? true)} onChange={(event) => setDraft({ ...draft, allowMemberInvites: event.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Allow members to invite their connections</span><span className="mt-1 block text-xs leading-5 text-muted-ink">Join requests still require admin approval.</span></span></label>
            <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(draft.requirePostApproval)} onChange={(event) => setDraft({ ...draft, requirePostApproval: event.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Review all new posts before publishing</span><span className="mt-1 block text-xs leading-5 text-muted-ink">For more review options, use Manage group → Content.</span></span></label>
          </div>
          <div className="rounded-xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">Group notifications</h3><p className="mt-1 text-xs leading-5 text-muted-ink">Manage notifications for new posts in this group.</p></div><button type="button" onClick={handleNotificationsToggle} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${group.notificationsEnabled ? "bg-brand text-white" : "border border-gray-300 text-ink"}`}>{group.notificationsEnabled ? "On" : "Off"}</button></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block rounded-xl border border-gray-200 p-3 text-sm font-medium">Group icon
              {draft.image?.url && <img src={draft.image.url} alt="Current group icon" className="my-2 h-16 w-16 rounded-lg object-cover" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDraft({ ...draft, image: event.target.files?.[0] || null })} className="mt-2 block w-full text-sm font-normal" />
              {draft.image instanceof File && <span className="mt-1 block truncate text-xs font-normal text-muted-ink">{draft.image.name}</span>}
            </label>
            <label className="block rounded-xl border border-gray-200 p-3 text-sm font-medium">Cover image
              {draft.coverImage?.url && <img src={draft.coverImage.url} alt="Current group cover" className="my-2 h-20 w-full rounded-lg object-cover" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDraft({ ...draft, coverImage: event.target.files?.[0] || null })} className="mt-2 block w-full text-sm font-normal" />
              {draft.coverImage instanceof File && <span className="mt-1 block truncate text-xs font-normal text-muted-ink">{draft.coverImage.name}</span>}
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setShowSettings(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>
        </form>
      </div>}
      {showEventForm && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingEvent) setShowEventForm(false); }}><form onSubmit={submitEvent} className="max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><header className="flex items-center justify-between"><h2 className="text-lg font-semibold">Create an event</h2><button type="button" onClick={() => setShowEventForm(false)} aria-label="Close"><X size={20} /></button></header><label className="block text-sm font-medium">Event name<input required maxLength={160} value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} className={fieldClass} /></label><label className="block text-sm font-medium">Description<textarea maxLength={3000} rows={3} value={eventDraft.description} onChange={(event) => setEventDraft({ ...eventDraft, description: event.target.value })} className={fieldClass} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Starts<input required type="datetime-local" value={eventDraft.startsAt} onChange={(event) => setEventDraft({ ...eventDraft, startsAt: event.target.value })} className={fieldClass} /></label><label className="block text-sm font-medium">Ends<input required type="datetime-local" value={eventDraft.endsAt} onChange={(event) => setEventDraft({ ...eventDraft, endsAt: event.target.value })} className={fieldClass} /></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eventDraft.isOnline} onChange={(event) => setEventDraft({ ...eventDraft, isOnline: event.target.checked })} />Online event</label>{!eventDraft.isOnline && <label className="block text-sm font-medium">Location<input maxLength={200} value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })} className={fieldClass} /></label>}{eventDraft.isOnline && <label className="block text-sm font-medium">Meeting link<input maxLength={500} type="url" value={eventDraft.meetingUrl} onChange={(event) => setEventDraft({ ...eventDraft, meetingUrl: event.target.value })} className={fieldClass} /></label>}<div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={creatingEvent} onClick={() => setShowEventForm(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={creatingEvent} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{creatingEvent ? "Creating…" : "Create event"}</button></div></form></div>}
    </div>
  );
}

function Metric({ value, label }) {
  return <div className="border-b border-gray-100 py-2.5"><p className="text-sm font-semibold text-ink">{value}</p><p className="text-xs text-muted-ink">{label}</p></div>;
}

function Dialog({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}</section></div>;
}

const fieldClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand";
