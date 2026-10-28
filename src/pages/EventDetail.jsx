import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Ban, BarChart3, CalendarDays, Check, ChevronDown, CircleHelp, Copy, Download, ExternalLink, EyeOff, Flag, Image as ImageIcon, Lightbulb, Link2, MapPin, MessageCircle, MoreHorizontal, MonitorPlay, Pencil, Pin, Reply, Send, Share2, Smile, ThumbsUp, Trash2, UsersRound, Video, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import useAuth from "../hooks/useAuth.js";
import api from "../services/api.js";
import { addEventComment, addEventCommentReply, cancelEvent, deleteEvent, deleteEventComment, getEvent, getEventPostAnalytics, getEvents, reportEventComment, toggleEventCommentLike, toggleEventCommentPin, toggleEventRsvp, updateEvent, updateEventAttendee, updateEventComment, updateEventCommentSettings } from "../services/communityServices.js";
import { createOrGetConversation, sendMessage } from "../services/messageServices.js";
import { playSoundEffect } from "../utils/playSoundEffect.js";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [event, setEvent] = useState(null);
  const [section, setSection] = useState("Details");
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [menu, setMenu] = useState("");
  const [sidebarMenu, setSidebarMenu] = useState("");
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendeeTab, setAttendeeTab] = useState("Attendees");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeResults, setAttendeeResults] = useState([]);
  const [comment, setComment] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [shareResults, setShareResults] = useState([]);
  const [shareSendingId, setShareSendingId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const viewAsMember = searchParams.get("viewAsMember") === "true";

  const load = useCallback(async () => {
    try {
      const result = await getEvent(eventId);
      setEvent(result.event);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load event");
    }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    getEvents()
      .then((events) => {
        if (active) {
          setRecommendedEvents(events.filter((item) => item._id !== eventId && !item.cancelledAt && new Date(item.startsAt) > new Date()).slice(0, 6));
        }
      })
      .catch((error) => toast.error(error.response?.data?.message || "Unable to load recommended events"))
      .finally(() => { if (active) setRecommendationsLoading(false); });
    return () => { active = false; };
  }, [eventId]);

  useEffect(() => {
    const query = attendeeSearch.trim();
    if (!attendeesOpen || attendeeTab !== "Attendees" || query.length < 2) {
      setAttendeeResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/users/search", { params: { q: query } });
        if (active) setAttendeeResults(data.users || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search members");
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [attendeeSearch, attendeeTab, attendeesOpen]);

  useEffect(() => {
    const query = shareSearch.trim();
    if (!shareOpen || query.length < 2) {
      setShareResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/users/search", { params: { q: query } });
        if (active) setShareResults(data.users || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search people");
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [shareOpen, shareSearch]);

  const isOrganizer = Boolean(event?.isOrganizer);
  const canManage = isOrganizer && !viewAsMember;
  const activeSection = canManage
    ? section === "Details" || section === "Networking" ? "Overview" : section
    : section === "Overview" || section === "Analytics" ? "Details" : section;
  const shareUrl = `${window.location.origin}/events/${eventId}`;
  const eventStatus = event ? (event.cancelledAt ? "Cancelled" : new Date(event.endsAt || event.startsAt) < new Date() ? "Ended" : "Upcoming") : "";
  const selectedComments = [...(event?.comments || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const rsvp = async () => {
    if (!event || busy) return;
    try {
      setBusy("rsvp");
      const result = await toggleEventRsvp(eventId);
      setEvent((current) => ({ ...current, isAttending: result.attending, attendeeCount: result.attendeeCount }));
      if (result.attending) playSoundEffect();
      toast.success(result.attending ? "You’re attending this event" : "You’re no longer attending");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update RSVP");
    } finally {
      setBusy("");
    }
  };

  const postComment = async (submitEvent, media = {}) => {
    submitEvent.preventDefault();
    if ((!comment.trim() && !media.image && !media.gifUrl) || busy) return;
    try {
      setBusy("comment");
      const comments = await addEventComment(eventId, { ...media, text: comment.trim() });
      setEvent((current) => ({ ...current, comments }));
      setComment("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to post comment");
    } finally {
      setBusy("");
    }
  };

  const saveEditedComment = async (commentId, text) => {
    try {
      const comments = await updateEventComment(eventId, commentId, text);
      setEvent((current) => ({ ...current, comments }));
      toast.success("Comment updated");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update comment");
      return false;
    }
  };

  const removeComment = async (commentId) => {
    try {
      const comments = await deleteEventComment(eventId, commentId);
      setEvent((current) => ({ ...current, comments }));
      toast.success("Comment deleted");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete comment");
      return false;
    }
  };

  const updateComments = async (action, commentId, text = "") => {
    try {
      const comments = action === "like"
        ? await toggleEventCommentLike(eventId, commentId)
        : action === "pin"
          ? await toggleEventCommentPin(eventId, commentId)
          : await addEventCommentReply(eventId, commentId, text);
      setEvent((current) => ({ ...current, comments }));
      if (action === "pin") toast.success("Comment pin updated");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update comment");
      return false;
    }
  };

  const changeCommentSettings = async () => {
    try {
      const commentsDisabled = await updateEventCommentSettings(eventId, !event.commentsDisabled);
      setEvent((current) => ({ ...current, commentsDisabled }));
      toast.success(commentsDisabled ? "Comments turned off" : "Comments turned on");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update comment settings");
    }
  };

  const removeEvent = async () => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      setBusy("delete");
      await deleteEvent(eventId);
      toast.success("Event deleted");
      navigate("/events");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete event");
      setBusy("");
    }
  };

  const openEditEvent = () => {
    setEditDraft({
      title: event.title || "",
      description: event.description || "",
      startsAt: toEventInputValue(event.startsAt, event.timezone),
      endsAt: event.endsAt ? toEventInputValue(event.endsAt, event.timezone) : "",
      hasEnd: Boolean(event.endsAt),
      timezone: event.timezone || "UTC",
      eventType: event.isOnline ? "online" : "in-person",
      location: event.location || "",
      externalLink: event.externalLink || event.meetingUrl || "",
      speakers: event.speakers || [],
      coverImage: null,
    });
    setEditOpen(true);
    setSidebarMenu("");
    setMenu("");
  };

  const saveEventEdits = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editDraft || editSaving) return;
    try {
      setEditSaving(true);
      const updated = await updateEvent(eventId, {
        ...editDraft,
        speakers: editDraft.speakers.map((speaker) => speaker._id || speaker),
        startsAt: localInputToIso(editDraft.startsAt, editDraft.timezone),
        endsAt: editDraft.hasEnd && editDraft.endsAt ? localInputToIso(editDraft.endsAt, editDraft.timezone) : "",
      });
      setEvent((current) => ({ ...current, ...updated, isOrganizer: current.isOrganizer }));
      setEditOpen(false);
      toast.success("Event updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update event");
    } finally {
      setEditSaving(false);
    }
  };

  const cancelHostedEvent = async () => {
    if (event.cancelledAt || !window.confirm("Cancel this event? Attendees will see that it has been cancelled.")) return;
    try {
      setBusy("cancel");
      const cancelled = await cancelEvent(eventId);
      setEvent((current) => ({ ...current, ...cancelled, isOrganizer: current.isOrganizer }));
      setSidebarMenu("");
      setMenu("");
      toast.success("Event cancelled");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel event");
    } finally {
      setBusy("");
    }
  };

  const submitEventReport = async (submitEvent) => {
    submitEvent.preventDefault();
    if (reporting) return;
    try {
      setReporting(true);
      await api.post(`/community/events/${eventId}/report`, { reason: reportReason, details: reportDetails });
      setReportOpen(false);
      setReportDetails("");
      toast.success("Event report submitted for review");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to submit event report");
    } finally {
      setReporting(false);
    }
  };

  const updateInvite = async (personId, action) => {
    try {
      setBusy(personId);
      await updateEventAttendee(eventId, personId, action);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update attendee list");
    } finally {
      setBusy("");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Event link copied");
      setMenu("");
    } catch {
      toast.error("Unable to copy event link");
    }
  };

  const repostEvent = async () => {
    try {
      setBusy("share");
      await api.post("/posts", { text: `${event.title}\n\n${shareUrl}` });
      toast.success("Event shared to your feed");
      setMenu("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to share event");
    } finally {
      setBusy("");
    }
  };

  const sendEventTo = async (recipientId) => {
    try {
      setShareSendingId(recipientId);
      setBusy("share");
      const conversation = await createOrGetConversation(recipientId.trim());
      await sendMessage(conversation._id, `Join this event: ${shareUrl}`);
      toast.success("Event sent in a message");
      setMenu("");
      setShareOpen(false);
      setShareSearch("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send event");
    } finally {
      setBusy("");
      setShareSendingId("");
    }
  };

  const messagePerson = async (person) => {
    if (!person?._id || person._id === user?._id) return;
    try {
      const conversation = await createOrGetConversation(person._id);
      navigate(`/messages/${conversation._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to open conversation");
    }
  };

  if (!event) return <main className="min-h-screen bg-[#f3f2ef] px-4 py-8"><Card className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-ink">Loading event…</Card></main>;
  const displayAttendees = event.attendees || [];
  const attendingPeople = displayAttendees.filter((person) => person._id !== event.organizer?._id);
  const attendeeTotal = attendingPeople.length + (event.organizer ? 1 : 0);

  return <main className="min-h-screen bg-[#f3f2ef] px-4 py-4 sm:px-6 sm:py-6">
    {canManage ? <div className="mx-auto grid max-w-[1288px] items-start gap-5 md:grid-cols-[242px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <EventCover event={event} className="aspect-video w-full" />
        <div className="p-4">
          <span className={`rounded px-2 py-1 text-xs font-semibold ${eventStatus === "Upcoming" ? "bg-emerald-50 text-emerald-800" : "bg-slate-600 text-white"}`}>{eventStatus}</span>
          <h1 className="mt-3 text-lg font-semibold leading-6 text-ink">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-ink">By <Link to={`/profile/${event.organizer?._id}`} className="hover:underline">{event.organizer?.name || "CareerLink member"}</Link></p>
          <p className="mt-3 flex items-start gap-2 text-sm text-ink"><CalendarDays size={17} className="mt-0.5 shrink-0" /><span>{formatEventTime(event)}</span></p>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink">{event.isOnline ? <MonitorPlay size={17} className="mt-0.5 shrink-0" /> : <MapPin size={17} className="mt-0.5 shrink-0" />}{event.isOnline ? "Online" : event.location}</p>
          {event.cancelledAt && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800">This event has been cancelled.</p>}
          {event.externalLink && <a href={event.externalLink} target="_blank" rel="noreferrer" className="mt-2 flex items-start gap-2 break-all text-sm text-muted-ink hover:text-brand"><ExternalLink size={16} className="mt-0.5 shrink-0" /><span className="line-clamp-2">{event.externalLink}</span></a>}
        </div>
        <nav className="border-t border-gray-200 py-1" aria-label="Event sections">
          {["Overview", "Analytics", "Comments"].map((item) => <button key={item} type="button" onClick={() => setSection(item)} aria-current={activeSection === item ? "page" : undefined} className={`flex w-full items-center justify-between border-l-4 px-4 py-3 text-left text-sm ${activeSection === item ? "border-gray-900 bg-gray-50 font-semibold text-ink" : "border-transparent text-ink hover:bg-gray-50"}`}>{item}{item === "Comments" && event.comments?.length > 0 && <span>{event.comments.length}</span>}</button>)}
        </nav>
        <div className="border-t border-gray-200">
          <button type="button" aria-expanded={sidebarMenu === "manage"} onClick={() => setSidebarMenu(sidebarMenu === "manage" ? "" : "manage")} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50">Manage event<ChevronDown className={sidebarMenu === "manage" ? "rotate-180" : "-rotate-90"} size={16} /></button>
          {sidebarMenu === "manage" && <div className="border-t border-gray-100 bg-gray-50 py-1">
            <button type="button" onClick={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); setSidebarMenu(""); }} className="w-full px-6 py-2.5 text-left text-sm hover:bg-gray-100">Manage attendees</button>
            <button type="button" onClick={openEditEvent} className="w-full border-t border-gray-200 px-6 py-2.5 text-left text-sm hover:bg-gray-100">Edit event</button>
            <button type="button" disabled={busy === "cancel" || Boolean(event.cancelledAt)} onClick={cancelHostedEvent} className="w-full border-t border-gray-200 px-6 py-2.5 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-muted-ink">{event.cancelledAt ? "Event cancelled" : busy === "cancel" ? "Cancelling event…" : "Cancel event"}</button>
            <button type="button" disabled={busy === "delete"} onClick={removeEvent} className="w-full border-t border-gray-200 px-6 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === "delete" ? "Deleting event…" : "Delete event"}</button>
          </div>}
          <button type="button" aria-expanded={sidebarMenu === "share"} onClick={() => setSidebarMenu(sidebarMenu === "share" ? "" : "share")} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50">Share<ChevronDown className={sidebarMenu === "share" ? "rotate-180" : "-rotate-90"} size={16} /></button>
          {sidebarMenu === "share" && <div className="border-t border-gray-100 bg-gray-50 py-1">
            <button type="button" onClick={copyLink} className="w-full px-6 py-2.5 text-left text-sm hover:bg-gray-100">Copy link</button>
            <button type="button" onClick={repostEvent} className="w-full px-6 py-2.5 text-left text-sm hover:bg-gray-100">Repost to Feed</button>
            <button type="button" onClick={() => setShareOpen(true)} className="w-full px-6 py-2.5 text-left text-sm hover:bg-gray-100">Send in message</button>
          </div>}
          <button type="button" onClick={() => setSearchParams({ viewAsMember: "true" })} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50">View as member</button>
          <Link to={`/profile/${event.organizer?._id}/recent-activity/events`} className="block border-t border-gray-100 px-4 py-3 text-sm text-ink hover:bg-gray-50">View all events</Link>
        </div>
      </aside>
      <section className="min-w-0 space-y-4">
        {activeSection === "Overview" ? <OrganizerOverview event={event} onShareRecap={() => navigate(`/events?shareEvent=${event._id}`)} onOpenAttendees={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); }} onShowAnalytics={() => setSection("Analytics")} onMessage={messagePerson} /> : activeSection === "Analytics" ? <Analytics event={event} onOpenAttendees={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); }} /> : <Comments event={event} comments={selectedComments} comment={comment} setComment={setComment} onSubmit={postComment} busy={busy === "comment"} user={user} isOrganizer={canManage} onSaveEdit={saveEditedComment} onDelete={removeComment} onMessage={messagePerson} onUpdateComments={updateComments} onChangeSettings={changeCommentSettings} />}
      </section>
    </div> : <div className="mx-auto grid max-w-[1412px] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_378px]">
      <section className="min-w-0 space-y-4">
        {viewAsMember && <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>Member preview</span><button type="button" onClick={() => setSearchParams({})} className="font-semibold underline">Exit preview</button></div>}
        {event.cancelledAt && <div role="status" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">This event has been cancelled by the organizer.</div>}
        <Card className="overflow-visible">
          <div className="overflow-hidden rounded-t-xl"><EventCover event={event} className="aspect-video max-h-[566px] w-full" /></div>
          <div className="p-5 sm:p-8">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"><span className={`grid h-5 w-5 place-items-center rounded-sm ${eventStatus === "Upcoming" ? "bg-emerald-700 text-white" : "bg-slate-500 text-white"}`}>{eventStatus === "Upcoming" ? <CalendarDays size={13} /> : eventStatus === "Cancelled" ? <Ban size={13} /> : <Check size={13} />}</span>Event {eventStatus.toLowerCase()}</p>
            <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-[30px]">{event.title}</h1>
            <p className="mt-1 text-base text-muted-ink">Event by <Link to={`/profile/${event.organizer?._id}`} className="font-medium text-ink hover:underline">{event.organizer?.name || "CareerLink member"}</Link></p>
            <p className="mt-4 flex items-start gap-3 text-sm text-ink"><CalendarDays size={21} className="mt-0.5 shrink-0 text-gray-700" />{formatEventTime(event)}</p>
            <p className="mt-3 flex items-start gap-3 text-sm text-ink">{event.isOnline ? <MonitorPlay size={21} className="mt-0.5 shrink-0 text-gray-700" /> : <MapPin size={21} className="mt-0.5 shrink-0 text-gray-700" />}{event.isOnline ? "Online" : event.location}</p>
            {event.externalLink && <a href={event.externalLink} target="_blank" rel="noreferrer" className="mt-3 flex items-start gap-3 break-all text-sm text-muted-ink hover:text-brand"><ExternalLink size={21} className="mt-0.5 shrink-0 text-gray-700" /><span><span className="font-medium text-ink">Event link</span> · {event.externalLink}</span></a>}
            <button type="button" onClick={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); }} className="mt-4 flex items-center gap-2 text-sm font-medium text-ink hover:underline">
              <span className="flex -space-x-2"><ProfileAvatar user={event.organizer} size={34} />{attendingPeople.slice(0, 2).map((person) => <ProfileAvatar key={person._id} user={person} size={34} />)}</span>
              <span>{event.organizer?.name || "Event host"}{attendeeTotal > 1 ? ` and ${attendeeTotal - 1} other ${attendeeTotal - 1 === 1 ? "attendee" : "attendees"}` : ""}</span>
            </button>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!canManage && !event.cancelledAt && new Date(event.startsAt) > new Date() && <button type="button" disabled={busy === "rsvp"} onClick={rsvp} className={`rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${event.isAttending ? "border border-gray-400 text-ink" : "bg-brand text-white"}`}>{event.isAttending ? "Going" : "Attend"}</button>}
              <div className="relative flex items-center gap-2">
                <button type="button" onClick={() => setMenu(menu === "share" ? "" : "share")} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Share <ChevronDown size={16} /></button>
                <button type="button" aria-label="More event options" aria-expanded={menu === "manage" || menu === "report"} onClick={() => setMenu(menu ? "" : canManage ? "manage" : "report")} className="grid h-10 w-10 place-items-center rounded-full border border-gray-400 hover:bg-gray-50"><MoreHorizontal size={20} /></button>
                {menu && <div className="absolute left-0 top-12 z-20 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {menu === "manage" && canManage ? <>
                    <button type="button" onClick={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); setMenu(""); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50">Manage attendees</button>
                    <button type="button" onClick={openEditEvent} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50"><Pencil size={15} />Edit event</button>
                    <button type="button" disabled={busy === "cancel" || Boolean(event.cancelledAt)} onClick={cancelHostedEvent} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50 disabled:text-muted-ink"><Ban size={15} />{event.cancelledAt ? "Event cancelled" : "Cancel event"}</button>
                    <button type="button" disabled={busy === "delete"} onClick={removeEvent} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50"><Trash2 size={15} />Delete event</button>
                  </> : menu === "report" ? <button type="button" onClick={() => { setMenu(""); setReportReason("spam"); setReportDetails(""); setReportOpen(true); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50"><Flag size={16} />Report event</button> : <>
                    <button type="button" onClick={copyLink} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"><Copy size={16} />Copy link</button>
                    <button type="button" disabled={busy === "share"} onClick={repostEvent} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"><Share2 size={16} />Repost to Feed</button>
                    <button type="button" disabled={busy === "share"} onClick={() => { setShareOpen(true); setMenu(""); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"><Send size={16} />Send In Message</button>
                  </>}
                </div>}
              </div>
            </div>
          </div>
          <nav className="flex overflow-x-auto border-t border-gray-200 px-5 sm:px-8" aria-label="Event sections">
            {(canManage ? ["Overview", "Analytics", "Comments"] : ["Details", "Comments", "Networking"]).map((item) => <button key={item} type="button" onClick={() => setSection(item)} aria-current={activeSection === item ? "page" : undefined} className={`shrink-0 border-b-2 px-4 py-4 text-sm font-medium ${activeSection === item ? "border-emerald-700 text-emerald-800" : "border-transparent text-ink hover:text-brand"}`}>{item}{item === "Comments" && event.comments?.length > 0 ? ` (${event.comments.length})` : ""}</button>)}
          </nav>
        </Card>
        {activeSection === "Overview" && canManage ? <OrganizerOverview event={event} onOpenAttendees={() => { setAttendeeTab("Attendees"); setAttendeesOpen(true); }} onShowAnalytics={() => setSection("Analytics")} /> : activeSection === "Details" ? <EventDetails event={event} /> : activeSection === "Comments" ? <Comments event={event} comments={selectedComments} comment={comment} setComment={setComment} onSubmit={postComment} busy={busy === "comment"} user={user} isOrganizer={canManage} onSaveEdit={saveEditedComment} onDelete={removeComment} onMessage={messagePerson} onUpdateComments={updateComments} onChangeSettings={changeCommentSettings} /> : activeSection === "Networking" ? <Networking event={event} attendees={attendingPeople} currentUser={user} onMessage={messagePerson} /> : activeSection === "Analytics" && canManage ? <Analytics event={event} onOpenAttendees={() => setAttendeesOpen(true)} /> : null}
      </section>

      <aside className="space-y-4">
        <Card className="flex items-start gap-4 p-5">
          <CalendarDays size={52} className="shrink-0 text-amber-500" />
          <div><p className="text-sm leading-6 text-ink">Host an event and invite your network</p><Link to="/events?create=true" className="mt-3 inline-flex rounded-full border border-gray-400 px-5 py-2 text-sm font-semibold text-ink hover:bg-gray-50">Create event</Link></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-ink">Other events for you</h2><Link to="/events" className="text-sm font-medium text-brand hover:underline">See all</Link></div>
          {recommendedEvents.length ? <div className="mt-4 space-y-5">{recommendedEvents.map((item) => <RecommendedEvent key={item._id} event={item} />)}</div> : <p className="py-6 text-sm text-muted-ink">{recommendationsLoading ? "Finding events for you…" : "No other upcoming events right now."}</p>}
        </Card>
        <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-3 text-xs text-muted-ink"><Link to="/settings" className="hover:underline">About</Link><Link to="/settings" className="hover:underline">Accessibility</Link><Link to="/settings" className="hover:underline">Help Center</Link><span>Privacy &amp; Terms</span><span>Advertising</span><span>Business Services</span><span>More</span><span className="w-full text-center font-semibold text-brand">CareerLink © 2026</span></footer>
      </aside>
    </div>}
    {attendeesOpen && <AttendeesModal
      event={event}
      tab={attendeeTab}
      setTab={setAttendeeTab}
      isOrganizer={canManage}
      search={attendeeSearch}
      setSearch={setAttendeeSearch}
      results={attendeeResults}
      busy={busy}
      onClose={() => setAttendeesOpen(false)}
      onInvite={updateInvite}
    />}
    {shareOpen && <ShareEventModal
      search={shareSearch}
      setSearch={setShareSearch}
      results={shareResults}
      busy={busy}
      sendingId={shareSendingId}
      onClose={() => setShareOpen(false)}
      onSend={sendEventTo}
    />}
    {editOpen && editDraft && <EditEventModal
      event={event}
      draft={editDraft}
      setDraft={setEditDraft}
      saving={editSaving}
      onSubmit={saveEventEdits}
      onClose={() => !editSaving && setEditOpen(false)}
    />}
    {reportOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/50 p-4" onMouseDown={(input) => { if (input.target === input.currentTarget && !reporting) setReportOpen(false); }}>
      <form onSubmit={submitEventReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-ink">Report event</h2>
        <p className="mt-1 text-sm text-muted-ink">Reports are submitted for moderator review.</p>
        <label className="mt-4 block text-sm font-medium text-ink">Reason<select value={reportReason} onChange={(input) => setReportReason(input.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misinformation</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option></select></label>
        <label className="mt-4 block text-sm font-medium text-ink">Details (optional)<textarea value={reportDetails} onChange={(input) => setReportDetails(input.target.value)} maxLength={1000} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={reporting} onClick={() => setReportOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button type="submit" disabled={reporting} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{reporting ? "Sending…" : "Submit report"}</button></div>
      </form>
    </div>}
  </main>;
}

function EventDetails({ event }) {
  return <Card className="p-5 sm:p-7">
    <h2 className="text-2xl font-semibold text-ink">About</h2>
    {event.description ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{event.description}</p> : <p className="mt-3 text-sm text-muted-ink">The organizer hasn’t added a description yet.</p>}
    {event.speakers?.length > 0 && <div className="mt-7 border-t border-gray-100 pt-5"><h3 className="font-semibold text-ink">Speakers</h3><div className="mt-3 flex flex-wrap gap-4">{event.speakers.map((speaker) => <Link key={speaker._id} to={`/profile/${speaker._id}`} className="flex items-center gap-2 text-sm hover:underline"><ProfileAvatar user={speaker} size={40} /><span><span className="block font-medium text-ink">{speaker.name}</span><span className="block text-xs text-muted-ink">{speaker.headline}</span></span></Link>)}</div></div>}
  </Card>;
}

function EditEventModal({ event, draft, setDraft, saving, onSubmit, onClose }) {
  const [coverPreview, setCoverPreview] = useState("");
  const [speakerQuery, setSpeakerQuery] = useState("");
  const [speakerResults, setSpeakerResults] = useState([]);
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  useEffect(() => {
    const query = speakerQuery.trim();
    if (query.length < 2) {
      setSpeakerResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/users/search", { params: { q: query } });
        if (active) setSpeakerResults(data.users || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search for speakers");
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [speakerQuery]);
  useEffect(() => {
    if (!draft.coverImage) {
      setCoverPreview("");
      return undefined;
    }
    const preview = URL.createObjectURL(draft.coverImage);
    setCoverPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [draft.coverImage]);
  const timezoneOptions = [
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London",
    "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "UTC",
  ];
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-3 sm:p-5" onMouseDown={(input) => { if (input.target === input.currentTarget && !saving) onClose(); }}>
    <form onSubmit={onSubmit} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="text-xl font-semibold text-ink">Edit event</h2><p className="mt-1 text-sm text-muted-ink">Update the event details for your attendees.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"><X size={21} /></button></header>
      <div className="overflow-y-auto p-5 sm:p-6">
        <label className="block text-sm font-medium text-ink">Event name*<input required maxLength={75} value={draft.title} onChange={(input) => update({ title: input.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
        <label className="mt-4 block text-sm font-medium text-ink">Description<textarea maxLength={5000} rows={4} value={draft.description} onChange={(input) => update({ description: input.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
        <label className="mt-4 block text-sm font-medium text-ink">Timezone<select required value={draft.timezone} onChange={(input) => update({ timezone: input.target.value })} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">{!timezoneOptions.includes(draft.timezone) && <option value={draft.timezone}>{draft.timezone}</option>}{timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-ink">Start date and time*<input required type="datetime-local" value={draft.startsAt} onChange={(input) => update({ startsAt: input.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>{draft.hasEnd && <label className="block text-sm font-medium text-ink">End date and time<input required type="datetime-local" value={draft.endsAt} onChange={(input) => update({ endsAt: input.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>}</div>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={draft.hasEnd} onChange={(input) => update({ hasEnd: input.target.checked, endsAt: input.target.checked ? draft.endsAt : "" })} className="h-4 w-4 accent-emerald-700" />Set an end date and time</label>
        <fieldset className="mt-4"><legend className="text-sm font-medium text-ink">Event type</legend><div className="mt-2 flex gap-6">{[["online", "Online"], ["in-person", "In person"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="edit-event-type" value={value} checked={draft.eventType === value} onChange={() => update({ eventType: value })} className="h-4 w-4 accent-emerald-700" />{label}</label>)}</div></fieldset>
        {draft.eventType === "online" ? <label className="mt-4 block text-sm font-medium text-ink">Event link*<input required type="url" maxLength={1024} value={draft.externalLink} onChange={(input) => update({ externalLink: input.target.value })} placeholder="https://…" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label> : <label className="mt-4 block text-sm font-medium text-ink">Location*<input required maxLength={200} value={draft.location} onChange={(input) => update({ location: input.target.value })} placeholder="Venue or address" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>}
        <div className="relative mt-4"><label className="block text-sm font-medium text-ink">Speakers<input value={speakerQuery} onChange={(input) => setSpeakerQuery(input.target.value)} placeholder="Search for connections" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
          {speakerResults.length > 0 && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">{speakerResults.filter((speaker) => !draft.speakers.some((selected) => (selected._id || selected) === speaker._id)).map((speaker) => <button key={speaker._id} type="button" onClick={() => { update({ speakers: [...draft.speakers, speaker] }); setSpeakerQuery(""); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"><ProfileAvatar user={speaker} size={32} /><span><span className="block text-sm font-medium">{speaker.name}</span><span className="block text-xs text-muted-ink">{speaker.headline}</span></span></button>)}</div>}
          {draft.speakers.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{draft.speakers.map((speaker) => <span key={speaker._id || speaker} className="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-2 pr-1 text-xs"><ProfileAvatar user={speaker} size={22} />{speaker.name || "Speaker"}<button type="button" aria-label={`Remove ${speaker.name || "speaker"}`} onClick={() => update({ speakers: draft.speakers.filter((selected) => (selected._id || selected) !== (speaker._id || speaker)) })} className="rounded-full p-1 hover:bg-gray-200"><X size={13} /></button></span>)}</div>}
        </div>
        <label className="mt-4 block text-sm font-medium text-ink">Cover image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(input) => update({ coverImage: input.target.files?.[0] || null })} className="mt-1 block w-full text-sm text-muted-ink file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink" /></label>
        {(coverPreview || event.coverImage?.url) && <img src={coverPreview || event.coverImage.url} alt="Event cover preview" className="mt-3 max-h-40 w-full rounded-lg object-cover" />}
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-ink disabled:opacity-50">Cancel</button><button type="submit" disabled={saving || !draft.title.trim()} className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></footer>
    </form>
  </div>;
}

function OrganizerOverview({ event, onShareRecap, onOpenAttendees, onShowAnalytics, onMessage }) {
  const visits = Number(event.pageVisits || 0);
  const engagementRate = visits ? `${(((event.attendeeCount || 0) / visits) * 100).toFixed(1)}%` : "0%";
  return <div className="space-y-4">
    <Card className="divide-y divide-gray-200 p-5 sm:p-6">
      <div className="flex min-h-28 flex-wrap items-center justify-between gap-4 py-3 first:pt-0">
        <div><h2 className="text-base font-semibold text-ink">Share a recap of your event</h2><p className="mt-1 text-sm text-muted-ink">Keep the momentum going by sharing highlights.</p></div>
        <button type="button" onClick={onShareRecap} className="rounded-full border border-gray-400 px-5 py-2 text-sm font-semibold text-ink hover:bg-gray-50">Post</button>
      </div>
      <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
        <div><h2 className="text-base font-semibold text-ink">Review results from your event</h2><p className="mt-1 text-sm text-muted-ink">Measure success with post-event analytics.</p></div>
        <button type="button" onClick={onShowAnalytics} className="text-sm font-semibold text-brand hover:underline">Review</button>
      </div>
      <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 pt-4">
        <div><h2 className="text-base font-semibold text-ink">Follow up with attendees</h2><p className="mt-1 text-sm text-muted-ink">See who joined your event for follow-up and further engagement.</p></div>
        <button type="button" onClick={onOpenAttendees} className="text-sm font-semibold text-brand hover:underline">View</button>
      </div>
    </Card>
    <Card className="overflow-hidden p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Analytic highlights</h2>
      <p className="mt-1 text-sm text-muted-ink">Review key performance highlights from your event.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <div><p className="text-xs text-muted-ink underline decoration-dotted underline-offset-4">Registrations</p><p className="mt-2 text-base text-ink">{Number(event.attendeeCount || 0).toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-ink underline decoration-dotted underline-offset-4">Event page visits</p><p className="mt-2 text-base text-ink">{visits.toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-ink underline decoration-dotted underline-offset-4">Engagement rate</p><p className="mt-2 text-base text-ink">{engagementRate}</p></div>
      </div>
      <button type="button" onClick={onShowAnalytics} className="mt-6 -mx-5 -mb-5 w-[calc(100%+2.5rem)] border-t border-gray-200 py-4 text-center text-sm text-muted-ink hover:bg-gray-50 sm:-mx-6 sm:-mb-6 sm:w-[calc(100%+3rem)]">Show in-depth analytics →</button>
    </Card>
    <Card className="overflow-hidden p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Event Speakers</h2>
      <p className="mt-1 text-sm text-muted-ink">Stay connected with your speakers to ensure event success.</p>
      {event.speakers?.length > 0 ? <div className="mt-4 divide-y divide-gray-100">
        {event.speakers.map((speaker) => <div key={speaker._id} className="flex flex-wrap items-center gap-3 py-4 first:pt-2">
          <Link to={`/profile/${speaker._id}`} className="shrink-0"><ProfileAvatar user={speaker} size={52} /></Link>
          <div className="min-w-0 flex-1">
            <Link to={`/profile/${speaker._id}`} className="font-medium text-ink hover:underline">{speaker.name || "CareerLink member"}</Link>
            <span className="ml-2 text-xs text-muted-ink">Speaker</span>
            <p className="mt-1 truncate text-sm text-muted-ink">{speaker.headline || "CareerLink member"}</p>
          </div>
          {speaker._id !== event.organizer?._id && <button type="button" onClick={() => onMessage(speaker)} className="inline-flex items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50"><Send size={15} />Message</button>}
        </div>)}
      </div> : <p className="mt-5 rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-muted-ink">No speakers have been added to this event.</p>}
      <button type="button" onClick={onOpenAttendees} className=" -mx-5 -mb-5 mt-1 w-[calc(100%+2.5rem)] border-t border-gray-200 py-4 text-center text-sm text-muted-ink hover:bg-gray-50 sm:-mx-6 sm:-mb-6 sm:w-[calc(100%+3rem)]">View event network →</button>
    </Card>
  </div>;
}

function Networking({ event, attendees, currentUser, onMessage }) {
  const host = event.organizer;
  const allAttendees = [...(host ? [host] : []), ...attendees];
  return <div className="space-y-4">
    {host && <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold text-ink">Event host</h2><NetworkPerson person={host} badge="Host" currentUser={currentUser} onMessage={onMessage} /></Card>}
    <Card className="p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-ink">{allAttendees.length} {allAttendees.length === 1 ? "attendee" : "attendees"}</h2>
      {allAttendees.length ? <div className="mt-3 divide-y divide-gray-100">{allAttendees.map((person) => <NetworkPerson key={person._id} person={person} badge={person._id === host?._id ? "Host" : ""} currentUser={currentUser} onMessage={onMessage} />)}</div> : <p className="py-6 text-sm text-muted-ink">No one has RSVP’d to this event yet.</p>}
    </Card>
  </div>;
}

function NetworkPerson({ person, badge, currentUser, onMessage }) {
  return <div className="flex items-center gap-3 py-4">
    <Link to={`/profile/${person._id}`} className="shrink-0"><ProfileAvatar user={person} size={54} /></Link>
    <div className="min-w-0 flex-1"><Link to={`/profile/${person._id}`} className="font-medium text-ink hover:underline">{person.name || "CareerLink member"}</Link>{badge && <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-ink">{badge}</span>}<p className="mt-1 truncate text-sm text-muted-ink">{person.headline || "CareerLink member"}</p></div>
    {person._id !== currentUser?._id && <button type="button" onClick={() => onMessage(person)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50"><Send size={15} />Message</button>}
  </div>;
}

function RecommendedEvent({ event }) {
  return <Link to={`/events/${event._id}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
    <EventCover event={event} className="aspect-[16/9] w-full rounded-lg" />
    <div className="min-w-0"><p className="text-xs text-ink">{formatRecommendedDate(event.startsAt)}</p><p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-ink">{event.title}</p><p className="mt-1 truncate text-xs text-muted-ink">{event.organizer?.name || "CareerLink member"}</p></div>
  </Link>;
}

function Analytics({ event, onOpenAttendees }) {
  const visits = Number(event.pageVisits || 0);
  const [postAnalytics, setPostAnalytics] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postError, setPostError] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [demographic, setDemographic] = useState("Job titles");

  useEffect(() => {
    let active = true;
    setLoadingPosts(true);
    getEventPostAnalytics(event._id)
      .then((result) => {
        if (!active) return;
        setPostAnalytics(result);
        setSelectedPostId((current) => result.posts.some((post) => post._id === current) ? current : result.posts[0]?._id || "");
        setPostError("");
      })
      .catch((error) => {
        if (active) setPostError(error.response?.data?.message || "Unable to load event post analytics.");
      })
      .finally(() => { if (active) setLoadingPosts(false); });
    return () => { active = false; };
  }, [event._id]);

  const posts = postAnalytics?.posts || [];
  const selectedPost = posts.find((post) => post._id === selectedPostId) || posts[0] || null;
  const scrollToPostAnalytics = () => document.getElementById("event-post-analytics")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const exportPost = () => {
    if (!selectedPost) return;
    const metrics = selectedPost.metrics;
    const rows = [
      ["Metric", "Value"],
      ["Post date", new Date(selectedPost.createdAt).toISOString()],
      ["Impressions", metrics.impressions],
      ["Members reached", metrics.membersReached ?? "Not tracked"],
      ["In-network audience", metrics.inNetworkPercent ?? "Not tracked"],
      ["Out-of-network audience", metrics.outOfNetworkPercent ?? "Not tracked"],
      ["Reactions", metrics.reactions],
      ["Comments", metrics.comments],
      ["Reposts", metrics.reposts],
      ["Saves", metrics.saves],
      ["Sends", metrics.sends ?? "Not tracked"],
      ["Profile viewers", metrics.profileViewers ?? "Not tracked"],
      ["Followers gained", metrics.followersGained ?? "Not tracked"],
      ["Video views", metrics.videoViews ?? "Not tracked"],
      ["Video watch minutes", metrics.videoWatchMinutes ?? "Not tracked"],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `event-post-analytics-${event._id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-4">
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Analytic highlights</h2>
      <p className="mt-1 text-sm text-muted-ink">Review key performance highlights from your event.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3"><Metric value={event.attendeeCount} label="Registrations" /><Metric value={visits} label="Event page visits" /><Metric value={visits ? `${(((event.attendeeCount || 0) / visits) * 100).toFixed(1)}%` : "0%"} label="Registration conversion" /></div>
    </Card>
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Registrations</h2>
      <p className="mt-1 text-sm leading-5 text-muted-ink">Registration totals update in real time. Paid and organic breakdowns are not currently available for CareerLink events.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3"><Metric value={event.attendeeCount} label="Total event registrations" /><Metric value={null} label="Paid registrations" /><Metric value={null} label="Organic registrations" /></div>
      <button type="button" onClick={onOpenAttendees} className="mt-4 text-sm font-semibold text-brand hover:underline">See all registrants</button>
    </Card>
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Top audience demographics</h2>
      <p className="mt-1 text-sm text-muted-ink">See a breakdown of who’s viewing and registering for your event.</p>
      <button type="button" onClick={scrollToPostAnalytics} className="mt-3 text-sm font-medium text-brand hover:underline">View details</button>
      <AnalyticsEmpty title="Demographics not available yet" message="Audience demographics are hidden until enough privacy-safe data is available." />
    </Card>
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-ink">
      <Lightbulb size={20} className="mt-0.5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1"><p className="font-medium">Track how your post performed on your social feed. Below is a streamlined view; open the full analytics tools for more data.</p><button type="button" onClick={scrollToPostAnalytics} className="mt-3 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-white/50">View</button></div>
    </div>
    <section id="event-post-analytics" className="scroll-mt-24">
      <Card className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-ink">Post analytics</h2>{posts.length > 1 && <select aria-label="Choose event post" value={selectedPost?.id || selectedPost?._id || ""} onChange={(input) => setSelectedPostId(input.target.value)} className="max-w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm">{posts.map((post) => <option key={post._id} value={post._id}>{new Date(post.createdAt).toLocaleDateString()} · {post.text?.slice(0, 35) || "Event announcement"}</option>)}</select>}</div>
          <button type="button" onClick={exportPost} disabled={!selectedPost} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-50"><Download size={16} />Export</button>
        </header>
        {loadingPosts ? <p className="p-8 text-center text-sm text-muted-ink">Loading event post analytics…</p> : postError ? <p role="alert" className="p-6 text-sm text-red-700">{postError}</p> : selectedPost ? <>
          <EventAnalyticsPostPreview post={selectedPost} event={postAnalytics.event} />
          <div className="space-y-3 bg-gray-50 p-4 sm:p-5">
            <Card className="p-5 sm:p-6">
              <AnalyticsSectionTitle title="Discovery" description="How many people saw your event post." />
              <div className="mt-5"><Metric value={selectedPost.metrics.impressions} label="Impressions" /></div>
              <AnalyticsMetricRow icon={<UsersRound size={15} />} label="In-network (followers and connections)" value={formatPercent(selectedPost.metrics.inNetworkPercent)} />
              <AnalyticsMetricRow icon={<UsersRound size={15} />} label="Out-of-network" value={formatPercent(selectedPost.metrics.outOfNetworkPercent)} />
              <div className="mt-4 border-t border-gray-100 pt-4"><Metric value={selectedPost.metrics.membersReached} label="Members reached" /></div>
              <p className="mt-3 text-xs text-muted-ink">Unique reach and audience source breakdown are not tracked yet.</p>
            </Card>
            <Card className="p-5 sm:p-6">
              <AnalyticsSectionTitle title="Profile activity" description="Activity people took on your profile after seeing this post." />
              <AnalyticsMetricRow label="Profile viewers from this post" value={selectedPost.metrics.profileViewers} />
              <AnalyticsMetricRow label="Followers gained from this post" value={selectedPost.metrics.followersGained} />
              <p className="mt-2 text-xs text-muted-ink">Post-specific profile visits and follows are not tracked yet.</p>
            </Card>
            <Card className="p-5 sm:p-6">
              <AnalyticsSectionTitle title="Engagement" description="Actions people took on your event post." />
              <div className="mt-5"><Metric value={selectedPost.metrics.reactions + selectedPost.metrics.comments + selectedPost.metrics.reposts + selectedPost.metrics.saves} label="Social engagements" /></div>
              <AnalyticsMetricRow label="Reactions" value={selectedPost.metrics.reactions} />
              <AnalyticsMetricRow label="Comments" value={selectedPost.metrics.comments} />
              <AnalyticsMetricRow label="Reposts" value={selectedPost.metrics.reposts} />
              <AnalyticsMetricRow label="Saves" value={selectedPost.metrics.saves} />
              <AnalyticsMetricRow label="Sends" value={selectedPost.metrics.sends} />
              {selectedPost.video?.url && <>
                <AnalyticsMetricRow icon={<Video size={15} />} label="Video views" value={selectedPost.metrics.videoViews} />
                <AnalyticsMetricRow icon={<Video size={15} />} label="Video watch time (minutes)" value={selectedPost.metrics.videoWatchMinutes} />
              </>}
              <p className="mt-2 text-xs text-muted-ink">Sends and video playback metrics are not tracked yet.</p>
            </Card>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><AnalyticsSectionTitle title="Top demographics" description={`Audience ${demographic.toLowerCase()} for this post.`} /><select value={demographic} onChange={(input) => setDemographic(input.target.value)} aria-label="Demographic category" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option>Job titles</option><option>Locations</option><option>Companies</option><option>Industries</option><option>Schools</option></select></div>
              <AnalyticsEmpty title="Demographics not available yet" message="To protect viewer privacy, demographic categories stay hidden until enough data is available." />
            </Card>
            <Link to="/dashboard" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-brand"><span className="flex items-center gap-3"><BarChart3 size={28} className="text-brand" /><span><span className="block text-sm font-semibold text-ink">Analytics &amp; tools</span><span className="block text-xs text-muted-ink">View all analytics, including followers</span></span></span><ArrowUpRight size={19} className="text-muted-ink" /></Link>
          </div>
        </> : <div className="p-8 text-center"><BarChart3 size={32} className="mx-auto text-muted-ink" /><h3 className="mt-3 font-semibold text-ink">No event post yet</h3><p className="mt-1 text-sm text-muted-ink">Share an event recap to see how its post performs in the feed.</p></div>}
      </Card>
    </section>
  </div>;
}

function Comments({ event, comments, comment, setComment, onSubmit, busy, user, isOrganizer, onSaveEdit, onDelete, onMessage, onUpdateComments, onChangeSettings }) {
  const [sortOrder, setSortOrder] = useState("relevant");
  const [openMenu, setOpenMenu] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editText, setEditText] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [gifUrl, setGifUrl] = useState("");
  const [showGifInput, setShowGifInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyId, setReplyId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [followingIds, setFollowingIds] = useState(() => new Set());
  const [hiddenCommentIds, setHiddenCommentIds] = useState(() => new Set());
  const [commentReport, setCommentReport] = useState(null);
  const [commentReportReason, setCommentReportReason] = useState("spam");
  const [commentReportDetails, setCommentReportDetails] = useState("");
  const [reportingComment, setReportingComment] = useState(false);
  const currentUserId = user?._id?.toString();
  useEffect(() => {
    let active = true;
    api.get("/users/following")
      .then(({ data }) => {
        if (active) setFollowingIds(new Set((data.following || []).map((id) => id.toString())));
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Unable to load followed members");
      });
    return () => { active = false; };
  }, []);

  const orderedComments = [...comments].sort((first, second) => {
    if (Boolean(first.pinned) !== Boolean(second.pinned)) return first.pinned ? -1 : 1;
    if (sortOrder === "recent") return new Date(second.createdAt) - new Date(first.createdAt);
    const firstIsOrganizer = first.author?._id?.toString() === event.organizer?._id?.toString();
    const secondIsOrganizer = second.author?._id?.toString() === event.organizer?._id?.toString();
    if (firstIsOrganizer !== secondIsOrganizer) return firstIsOrganizer ? -1 : 1;
    return new Date(first.createdAt) - new Date(second.createdAt);
  });

  const copyCommentLink = async (item) => {
    const url = `${window.location.origin}/events/${event._id}#comment-${item._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Comment link copied");
    } catch {
      toast.error("Unable to copy comment link");
    }
    setOpenMenu("");
  };

  const saveEdit = async (item) => {
    if (!editText.trim()) return;
    if (await onSaveEdit(item._id, editText.trim())) {
      setEditingId("");
      setEditText("");
      setOpenMenu("");
    }
  };

  const deleteComment = async (item) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    if (await onDelete(item._id)) setOpenMenu("");
  };

  const submitReply = async (item) => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    if (await onUpdateComments("reply", item._id, replyText.trim())) {
      setReplyText("");
      setReplyId("");
    }
    setSendingReply(false);
  };

  const pickCommentImage = (input) => {
    const file = input.target.files?.[0];
    input.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, WEBP, or GIF image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10 MB or smaller");
      return;
    }
    setCommentImage(file);
  };

  const unfollowMember = async (person) => {
    if (!person?._id) return;
    try {
      const { data } = await api.post(`/users/follow/${person._id}`);
      setFollowingIds((previous) => {
        const next = new Set(previous);
        if (data.following) next.add(person._id.toString());
        else next.delete(person._id.toString());
        return next;
      });
      toast.success(data.following ? `You are now following ${person.name}` : `You unfollowed ${person.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update follow status");
    }
    setOpenMenu("");
  };

  const submitCommentReport = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!commentReport || reportingComment) return;
    try {
      setReportingComment(true);
      await reportEventComment(event._id, commentReport._id, {
        reason: commentReportReason,
        details: commentReportDetails,
      });
      setCommentReport(null);
      setCommentReportDetails("");
      toast.success("Comment report submitted for review");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to submit comment report");
    } finally {
      setReportingComment(false);
    }
  };

  const hideComment = (commentId) => {
    setHiddenCommentIds((previous) => new Set(previous).add(commentId.toString()));
    setOpenMenu("");
    toast.success("Comment hidden");
  };

  return <>
  <div className="space-y-4">
    <Card className="overflow-hidden">
      <Link to={`/events/${event._id}`} className="group flex flex-col overflow-hidden sm:flex-row">
        <EventCover event={event} className="h-40 w-full shrink-0 sm:h-36 sm:w-56" />
        <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
          <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${new Date(event.endsAt || event.startsAt) < new Date() ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}>{new Date(event.endsAt || event.startsAt) < new Date() ? "Ended" : "Upcoming"}</span>
          <h2 className="mt-2 text-lg font-semibold text-ink group-hover:text-brand">{event.title}</h2>
          <p className="mt-1 text-sm text-muted-ink">By {event.organizer?.name || "CareerLink member"}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink"><CalendarDays size={16} className="mt-0.5 shrink-0" />{formatEventTime(event)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink">{event.isOnline ? <MonitorPlay size={16} /> : <MapPin size={16} />}{event.isOnline ? "Online" : event.location}</p>
        </div>
      </Link>
    </Card>
    <Card className="overflow-visible">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">Comments <span className="text-sm font-normal text-muted-ink">· {comments.length}</span></h2>
        {isOrganizer && <div className="relative">
          <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} className="rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-50">Who can comment? <ChevronDown size={15} className="ml-1 inline" /></button>
          {settingsOpen && <div className="absolute right-0 top-11 z-30 w-60 rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
            <button type="button" onClick={() => { onChangeSettings(false); setSettingsOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"><span className="font-medium">Anyone</span><span className="block text-xs text-muted-ink">Anyone viewing this event can comment</span></button>
            <button type="button" onClick={() => { onChangeSettings(true); setSettingsOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"><span className="font-medium">No one</span><span className="block text-xs text-muted-ink">Turn off new comments and replies</span></button>
          </div>}
        </div>}
      </header>
      {event.commentsDisabled ? <p className="border-b border-gray-100 px-5 py-4 text-sm text-muted-ink">The organizer has turned off comments for this event.</p> : <form onSubmit={(submitEvent) => onSubmit(submitEvent, { image: commentImage, gifUrl })} className="flex items-start gap-3 border-b border-gray-100 p-5">
        <ProfileAvatar user={user || {}} size={42} />
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="event-comment">Add a comment</label>
          <textarea id="event-comment" value={comment} onChange={(input) => setComment(input.target.value)} maxLength={1000} rows={2} placeholder="Add a comment…" className="w-full resize-y rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand" />
          {commentImage && <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"><span className="truncate">{commentImage.name}</span><button type="button" aria-label="Remove image" onClick={() => setCommentImage(null)} className="rounded-full p-1 hover:bg-gray-200"><X size={16} /></button></div>}
          {showGifInput && <label className="mt-2 block text-xs font-medium text-muted-ink">GIF URL<input type="url" value={gifUrl} onChange={(input) => setGifUrl(input.target.value)} placeholder="https://…/animation.gif" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand" /></label>}
          {showEmojiPicker && <div className="relative z-20 mt-2"><EmojiPicker onEmojiClick={(emojiData) => setComment(`${comment}${emojiData.emoji}`)} width={300} height={350} /></div>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Add emoji" aria-expanded={showEmojiPicker} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="rounded-full p-2 text-muted-ink hover:bg-gray-100"><Smile size={19} /></button>
              <button type="button" aria-expanded={showGifInput} onClick={() => setShowGifInput(!showGifInput)} className="rounded px-2 py-1 text-sm font-bold text-muted-ink hover:bg-gray-100">GIF</button>
              <label className="grid cursor-pointer place-items-center rounded-full p-2 text-muted-ink hover:bg-gray-100" aria-label="Add image"><ImageIcon size={19} /><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickCommentImage} className="sr-only" /></label>
            </div>
            <button type="submit" disabled={busy || (!comment.trim() && !commentImage && !gifUrl)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Posting…" : "Comment"}</button>
          </div>
        </div>
      </form>}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className="text-sm text-muted-ink">{isOrganizer ? "All event comments" : "Join the event conversation"}</p>
        <label className="flex items-center gap-2 text-sm text-muted-ink"><span className="sr-only">Sort comments</span><select value={sortOrder} onChange={(input) => setSortOrder(input.target.value)} className="rounded-lg border-0 bg-transparent py-1 text-sm font-medium text-ink outline-none"><option value="relevant">Most relevant</option><option value="recent">Most recent</option></select></label>
      </div>
      {orderedComments.filter((item) => !hiddenCommentIds.has(item._id?.toString())).length ? <div className="divide-y divide-gray-100 px-5">
        {orderedComments.filter((item) => !hiddenCommentIds.has(item._id?.toString())).map((item) => {
          const commentId = item._id?.toString() || `${item.author?._id}-${item.createdAt}`;
          const isAuthor = item.author?._id?.toString() === currentUserId;
          const isOtherMember = !isAuthor && item.author?._id;
          const canEdit = isAuthor || isOrganizer;
          const canDelete = isAuthor || isOrganizer;
          const isLiked = (item.likes || []).some((id) => (id?._id || id)?.toString() === currentUserId);
          return <article id={`comment-${commentId}`} key={commentId} className="flex gap-3 py-5">
            <Link to={`/profile/${item.author?._id}`} className="shrink-0"><ProfileAvatar user={item.author || {}} size={42} /></Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/profile/${item.author?._id}`} className="text-sm font-semibold text-ink hover:underline">{item.author?.name || "CareerLink member"}</Link>
                  {item.author?._id?.toString() === event.organizer?._id?.toString() && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Organizer</span>}
                  <p className="mt-0.5 text-xs text-muted-ink">{item.author?.headline || "CareerLink member"} · {formatCommentDate(item.createdAt)}</p>
                </div>
                <div className="relative shrink-0">
                  <button type="button" aria-label="Comment actions" aria-expanded={openMenu === commentId} onClick={() => setOpenMenu(openMenu === commentId ? "" : commentId)} className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100 hover:text-ink"><MoreHorizontal size={20} /></button>
                  {openMenu === commentId && <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                    <button type="button" onClick={() => copyCommentLink(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><Link2 size={17} />Copy link to comment</button>
                    {isOtherMember && followingIds.has(item.author._id.toString()) && <button type="button" onClick={() => unfollowMember(item.author)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><UsersRound size={17} />Unfollow {item.author.name?.split(" ")[0] || "member"}</button>}
                    {isOrganizer && <button type="button" onClick={() => { onUpdateComments("pin", item._id); setOpenMenu(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><Pin size={17} />{item.pinned ? "Unpin comment" : "Pin comment"}</button>}
                    {!isAuthor && item.author?._id && <>
                      <Link to={`/profile/${item.author._id}`} onClick={() => setOpenMenu("")} className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-gray-50"><UsersRound size={17} />View profile</Link>
                      <button type="button" onClick={() => { setOpenMenu(""); onMessage(item.author); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><MessageCircle size={17} />Message {item.author.name?.split(" ")[0] || "author"}</button>
                    </>}
                    {canEdit && <button type="button" onClick={() => { setEditingId(commentId); setEditText(item.text); setOpenMenu(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><Pencil size={17} />Edit</button>}
                    {canDelete && <button type="button" onClick={() => deleteComment(item)} className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50"><Trash2 size={17} />Delete{isOrganizer && !isAuthor ? " comment" : ""}</button>}
                    {isOtherMember && <button type="button" onClick={() => { setCommentReport(item); setCommentReportReason("spam"); setCommentReportDetails(""); setOpenMenu(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50"><Flag size={17} />Report</button>}
                    {isOtherMember && <button type="button" onClick={() => hideComment(item._id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><EyeOff size={17} />I don’t want to see this</button>}
                  </div>}
                </div>
              </div>
              {item.pinned && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-ink"><Pin size={13} />Pinned by the organizer</p>}
              {editingId === commentId ? <div className="mt-3">
                <textarea autoFocus value={editText} onChange={(input) => setEditText(input.target.value)} maxLength={1000} rows={3} aria-label="Edit comment" className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" />
                <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => { setEditingId(""); setEditText(""); }} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-ink">Cancel</button><button type="button" onClick={() => saveEdit(item)} disabled={!editText.trim()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button></div>
              </div> : item.text && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{item.text}</p>}
              {item.image?.url && <img src={item.image.url} alt="Comment attachment" className="mt-3 max-h-80 max-w-full rounded-lg object-contain" />}
              {item.gifUrl && <img src={item.gifUrl} alt="Comment GIF" className="mt-3 max-h-80 max-w-full rounded-lg object-contain" />}
              <div className="mt-2 flex items-center gap-4">
                <button type="button" aria-pressed={isLiked} onClick={() => onUpdateComments("like", item._id)} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isLiked ? "text-brand" : "text-muted-ink hover:text-brand"}`}><ThumbsUp size={15} />Like{item.likes?.length ? ` · ${item.likes.length}` : ""}</button>
                {!event.commentsDisabled && <button type="button" onClick={() => { setReplyId(replyId === commentId ? "" : commentId); setReplyText(""); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-ink hover:text-brand"><Reply size={15} />Reply{item.replies?.length ? ` · ${item.replies.length}` : ""}</button>}
              </div>
              {item.replies?.length > 0 && <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3">{item.replies.map((reply) => <div key={reply._id || `${reply.author?._id}-${reply.createdAt}`} className="flex gap-2"><ProfileAvatar user={reply.author || {}} size={28} /><div className="min-w-0"><p className="text-xs font-semibold text-ink">{reply.author?.name || "CareerLink member"} <span className="font-normal text-muted-ink">· {formatCommentDate(reply.createdAt)}</span></p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{reply.text}</p></div></div>)}</div>}
              {replyId === commentId && !event.commentsDisabled && <form onSubmit={(submitEvent) => { submitEvent.preventDefault(); submitReply(item); }} className="mt-3 flex gap-2"><ProfileAvatar user={user || {}} size={30} /><div className="flex min-w-0 flex-1 gap-2"><input autoFocus value={replyText} onChange={(input) => setReplyText(input.target.value)} maxLength={1000} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" /><button type="submit" disabled={sendingReply || !replyText.trim()} className="rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{sendingReply ? "Sending…" : "Reply"}</button></div></form>}
            </div>
          </article>;
        })}
      </div> : <div className="px-5 py-12 text-center"><MessageCircle size={30} className="mx-auto text-muted-ink" /><p className="mt-3 text-sm font-semibold text-ink">No comments yet</p><p className="mt-1 text-sm text-muted-ink">Start the conversation about this event.</p></div>}
    </Card>
  </div>
  {commentReport && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/50 p-4" onMouseDown={(input) => { if (input.target === input.currentTarget && !reportingComment) setCommentReport(null); }}>
    <form onSubmit={submitCommentReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="text-lg font-semibold text-ink">Report comment</h2>
      <p className="mt-1 text-sm text-muted-ink">Reports are submitted for moderator review.</p>
      <label className="mt-4 block text-sm font-medium text-ink">Reason<select value={commentReportReason} onChange={(input) => setCommentReportReason(input.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misinformation</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option></select></label>
      <label className="mt-4 block text-sm font-medium text-ink">Details (optional)<textarea value={commentReportDetails} onChange={(input) => setCommentReportDetails(input.target.value)} maxLength={1000} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></label>
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={reportingComment} onClick={() => setCommentReport(null)} className="rounded-full border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button type="submit" disabled={reportingComment} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{reportingComment ? "Sending…" : "Submit report"}</button></div>
    </form>
  </div>}
  </>;
}

function AttendeesModal({ event, tab, setTab, isOrganizer, search, setSearch, results, busy, onClose, onInvite }) {
  const attendees = event.attendees || [];
  const invited = event.invitedMembers || [];
  const rows = tab === "Invited" ? invited : attendees;
  const filteredRows = rows.filter((person) => !search || `${person.name || ""} ${person.headline || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="attendees-title" className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div><h2 id="attendees-title" className="text-xl font-semibold text-ink">Manage attendees</h2><p className="mt-1 text-sm text-muted-ink">View and manage people connected to your event.</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><X size={21} /></button>
      </header>
      <nav className="flex border-b border-gray-100 px-5 sm:px-6">{["Attendees", ...(isOrganizer ? ["Invited"] : [])].map((item) => <button key={item} type="button" onClick={() => { setTab(item); setSearch(""); }} className={`border-b-2 px-4 py-3 text-sm ${tab === item ? "border-emerald-700 font-semibold text-emerald-800" : "border-transparent text-ink"}`}>{item}{item === "Attendees" ? ` (${attendees.length})` : ` (${invited.length})`}</button>)}</nav>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-sm text-muted-ink">{filteredRows.length} {filteredRows.length === 1 ? "person" : "people"}</p>{isOrganizer && tab === "Attendees" && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people to invite" aria-label="Search people to invite" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand sm:max-w-xs" />}</div>
        {isOrganizer && tab === "Attendees" && results.length > 0 && <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 sm:px-6"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-ink">Invite people</p>{results.filter((person) => !invited.some((item) => item._id === person._id) && !attendees.some((item) => item._id === person._id)).map((person) => <PersonAction key={person._id} person={person} label="Invite" busy={busy === person._id} onClick={() => onInvite(person._id, "invite")} />)}</div>}
        {filteredRows.length ? <div className="divide-y divide-gray-100 px-5 sm:px-6">{filteredRows.map((person) => <PersonAction
          key={person._id}
          person={person}
          label={tab === "Invited" ? "Cancel invite" : person._id === event.organizer?._id ? "Organizer" : "Remove"}
          busy={busy === person._id}
          onClick={() => tab === "Invited" ? onInvite(person._id, "uninvite") : onInvite(person._id, "remove-attendee")}
          disabled={!isOrganizer || person._id === event.organizer?._id}
          destructive={tab === "Attendees" && person._id !== event.organizer?._id}
          status={tab === "Invited" ? "Invited" : person._id === event.organizer?._id ? "Organizer" : "Attending"}
        />)}</div>
          : <p className="p-10 text-center text-sm text-muted-ink">{tab === "Invited" ? "No one has been invited yet." : "No attendees yet."}</p>}
      </div>
      <footer className="flex justify-end border-t border-gray-100 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white">Done</button></footer>
    </section>
  </div>;
}

function PersonAction({ person, label, onClick, disabled = false, busy = false, destructive = false, status = "" }) {
  return <div className="flex items-center gap-3 py-4">
    <ProfileAvatar user={person} size={48} />
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{person.name}</p><p className="mt-1 truncate text-xs text-muted-ink">{person.headline || "CareerLink member"}</p></div>
    {status && <span className={`hidden rounded px-2 py-1 text-xs font-medium sm:inline-flex ${status === "Organizer" ? "bg-gray-100 text-gray-700" : status === "Invited" ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{status}</span>}
    {onClick && <button type="button" disabled={disabled || busy} onClick={onClick} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${destructive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-gray-400 text-ink hover:bg-gray-50"}`}>{busy ? "Saving…" : label}</button>}
  </div>;
}

function ShareEventModal({ search, setSearch, results, busy, sendingId, onClose, onSend }) {
  return <div className="fixed inset-0 z-[115] grid place-items-center bg-black/60 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && busy !== "share") onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="share-event-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 id="share-event-title" className="text-lg font-semibold text-ink">Send event in a message</h2><button type="button" disabled={busy === "share"} onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button></header>
      <div className="p-5"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" />
        <div className="mt-3 max-h-[50vh] overflow-y-auto">{results.map((person) => <PersonAction key={person._id} person={person} label="Send" busy={sendingId === person._id} disabled={Boolean(busy)} onClick={() => onSend(person._id)} />)}{search.trim().length >= 2 && results.length === 0 && <p className="py-6 text-center text-sm text-muted-ink">No people found.</p>}</div>
      </div>
    </section>
  </div>;
}

function EventCover({ event, className = "" }) {
  return event.coverImage?.url ? <img src={event.coverImage.url} alt="" className={`${className} object-cover`} /> : <div className={`${className} grid place-items-center bg-gradient-to-br from-sky to-violet-100 text-brand`}><CalendarDays size={28} /></div>;
}

function Metric({ value, label }) {
  const displayValue = value === null || value === undefined
    ? "0"
    : typeof value === "number" ? value.toLocaleString() : value;
  return <div><p className="text-xl font-semibold text-ink">{displayValue}</p><p className="mt-1 text-sm text-muted-ink">{label}</p></div>;
}

function AnalyticsEmpty({ title, message }) {
  return <div className="py-7 text-center">
    <UsersRound size={28} className="mx-auto text-muted-ink" />
    <p className="mt-2 text-sm font-medium text-ink">{title}</p>
    <p className="mt-1 text-xs text-muted-ink">{message}</p>
  </div>;
}

function AnalyticsSectionTitle({ title, description }) {
  return <div className="flex items-start gap-2">
    <div><h3 className="text-base font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-muted-ink">{description}</p></div>
    <CircleHelp size={16} aria-label={description} className="mt-1 shrink-0 text-muted-ink" />
  </div>;
}

function AnalyticsMetricRow({ icon, label, value }) {
  return <div className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 text-sm">
    <span className="flex min-w-0 items-center gap-2 text-ink">{icon}<span>{label}</span></span>
    <span className="shrink-0 font-semibold text-ink">{value === null || value === undefined || !Number.isFinite(Number(value)) ? "0" : Number(value).toLocaleString()}</span>
  </div>;
}

function formatPercent(value) {
  const percentage = Number(value);
  return value === null || value === undefined || !Number.isFinite(percentage) ? "0%" : `${percentage.toFixed(1)}%`;
}

function EventAnalyticsPostPreview({ post, event }) {
  return <article className="mx-4 my-4 rounded-xl border border-gray-200 p-4 sm:mx-6 sm:p-5">
    <div className="flex items-center gap-3">
      <ProfileAvatar user={post.author || {}} size={44} />
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{post.author?.name || "You"}</p><p className="text-xs text-muted-ink">{post.author?.headline || "Event organizer"} · {formatCommentDate(post.createdAt)}</p></div>
      <span className="ml-auto shrink-0 text-xs text-muted-ink">{new Date(post.createdAt).toLocaleDateString()}</span>
    </div>
    {post.text && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{post.text}</p>}
    {post.image?.url && <img src={post.image.url} alt="" className="mt-4 max-h-80 w-full rounded-lg object-cover" />}
    {post.video?.url && <video src={post.video.url} controls className="mt-4 max-h-80 w-full rounded-lg bg-black" aria-label="Event post video" />}
    {event && <Link to={`/events/${event._id}`} className="mt-4 flex overflow-hidden rounded-lg border border-gray-200 hover:bg-gray-50">
      <EventCover event={event} className="h-28 w-28 shrink-0 sm:h-32 sm:w-40" />
      <div className="min-w-0 p-3 sm:p-4"><p className="line-clamp-2 font-semibold text-ink">{event.title}</p><p className="mt-1 text-xs text-muted-ink">{formatRecommendedDate(event.startsAt)}</p><p className="mt-1 truncate text-xs text-muted-ink">{event.isOnline ? "Online event" : event.location || "In-person event"}</p><span className="mt-2 inline-block text-xs font-semibold text-brand">View event</span></div>
    </Link>}
  </article>;
}

function formatEventTime(event) {
  const options = { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };
  const start = new Intl.DateTimeFormat(undefined, options).format(new Date(event.startsAt));
  const end = event.endsAt ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(event.endsAt)) : "";
  return `${start}${end ? ` - ${end}` : ""} (your local time)`;
}

function toEventInputValue(value, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value)).map(({ type, value: partValue }) => [type, partValue]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function localInputToIso(value, timezone) {
  if (!value) return "";
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    const adjustment = desired - represented;
    candidate += adjustment;
    if (!adjustment) break;
  }
  return new Date(candidate).toISOString();
}

function formatRecommendedDate(value) {
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return `${isToday ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date)}, ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function formatCommentDate(value) {
  const date = new Date(value);
  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)}m`;
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h`;
  return `${Math.floor(elapsedMinutes / 1440)}d`;
}
