import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Check, ImagePlus, MapPin, MonitorPlay, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import useAuth from "../hooks/useAuth.js";
import api from "../services/api.js";
import { createEvent, getEvent, getEvents, toggleEventRsvp } from "../services/communityServices.js";
import useTranslation from "../hooks/useTranslation";

const fieldClass = "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand";
const timezoneOptions = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London",
  "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "UTC",
];
const emptyForm = (timezone) => ({
  title: "",
  description: "",
  startsAt: toLocalInputValue(new Date(Date.now() + 3_600_000)),
  endsAt: toLocalInputValue(new Date(Date.now() + 7_200_000)),
  hasEnd: true,
  timezone,
  eventType: "online",
  location: "",
  externalLink: "",
  coverImage: null,
  speakers: [],
});

export default function Events() {
  const { user } = useAuth();
  const t = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [announcementEvent, setAnnouncementEvent] = useState(null);
  const [postSuccess, setPostSuccess] = useState(null);
  const [form, setForm] = useState(() => emptyForm(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"));
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speakerQuery, setSpeakerQuery] = useState("");
  const [speakerResults, setSpeakerResults] = useState([]);

  const load = useCallback(async (query = "") => {
    try {
      setLoading(true);
      setEvents(await getEvents(query));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowForm(true);
      setSearchParams((params) => {
        params.delete("create");
        return params;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const eventId = searchParams.get("shareEvent");
    if (!eventId) return;
    let active = true;
    getEvent(eventId)
      .then((result) => {
        if (active) setAnnouncementEvent(result.event);
      })
      .catch((error) => toast.error(error.response?.data?.message || "Unable to open event post composer"))
      .finally(() => {
        if (active) {
          setSearchParams((params) => {
            params.delete("shareEvent");
            return params;
          }, { replace: true });
        }
      });
    return () => { active = false; };
  }, [searchParams, setSearchParams]);

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

  const visibleEvents = useMemo(() => events.filter((event) => {
    if (activeTab === "hosted") return event.isOrganizer;
    if (activeTab === "attending") return event.isAttending;
    return true;
  }), [activeTab, events]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        startsAt: localInputToIso(form.startsAt, form.timezone),
        endsAt: form.hasEnd ? localInputToIso(form.endsAt, form.timezone) : "",
      };
      const created = await createEvent(payload);
      setEvents((items) => [{ ...created, attendeeCount: 0, isAttending: false, isOrganizer: true }, ...items]);
      setShowForm(false);
      setForm(emptyForm(form.timezone));
      setAnnouncementEvent(created);
      toast.success("Event created. Share it with your network.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create event");
    } finally {
      setSaving(false);
    }
  };

  const rsvp = async (id) => {
    try {
      const result = await toggleEventRsvp(id);
      setEvents((items) => items.map((item) => item._id === id
        ? { ...item, isAttending: result.attending, attendeeCount: result.attendeeCount }
        : item));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update RSVP");
    }
  };

  return <main className="min-h-screen bg-[#f3f2ef] px-4 py-6">
    <div className="mx-auto grid max-w-[1120px] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-4">
        <Card className="overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h1 className="text-xl font-semibold text-ink">{t("Events")}</h1>
            <button type="button" onClick={() => setShowForm(true)} className="rounded-md bg-sky px-4 py-2 text-sm font-semibold text-brand hover:bg-blue-100">{t("Create")}</button>
          </header>
          <div className="border-b border-gray-100 px-5 py-4 text-sm text-muted-ink">{visibleEvents.length} {visibleEvents.length === 1 ? "Event" : "Events"}</div>
          <nav className="flex gap-2 overflow-x-auto border-b border-gray-100 px-5" aria-label="Event filters">
            {[["all", "All events"], ["attending", "Attending"], ["hosted", "Organizing"]].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} aria-pressed={activeTab === key} className={`shrink-0 border-b-2 px-3 py-3 text-sm ${activeTab === key ? "border-emerald-700 font-semibold text-emerald-800" : "border-transparent text-muted-ink hover:text-ink"}`}>{t(label)}</button>)}
          </nav>
          <form onSubmit={(event) => { event.preventDefault(); load(search); }} className="flex gap-2 p-4">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-300 bg-white px-3"><Search size={16} className="shrink-0 text-muted-ink" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search events")} aria-label={t("Search events")} className="min-w-0 flex-1 py-2 text-sm outline-none" /></label>
            <button type="submit" className="rounded-md border border-gray-300 px-4 text-sm font-semibold text-ink hover:bg-gray-50">{t("Search")}</button>
          </form>
          {loading ? <p className="p-8 text-center text-sm text-muted-ink">{t("Loading events…")}</p>
            : visibleEvents.length ? <div className="divide-y divide-gray-100">{visibleEvents.map((event) => <EventListItem key={event._id} event={event} onRsvp={rsvp} />)}</div>
              : <div className="px-5 py-12 text-center"><CalendarDays size={32} className="mx-auto text-muted-ink" /><h2 className="mt-3 text-base font-semibold text-ink">{t("No events found")}</h2><p className="mt-1 text-sm text-muted-ink">{t(activeTab === "hosted" ? "Events you organize will appear here." : activeTab === "attending" ? "Events you RSVP to will appear here." : "Try another search or create an event.")}</p></div>}
        </Card>
      </section>
      <aside className="space-y-3">
        <Card className="flex items-start gap-3 p-4"><CalendarDays size={38} className="shrink-0 text-amber-500" /><div><p className="text-sm text-ink">{t("Host an event and invite your network")}</p><button type="button" onClick={() => setShowForm(true)} className="mt-3 rounded-full border border-gray-400 px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50">{t("Create event")}</button></div></Card>
        <Card className="p-4"><h2 className="text-sm font-semibold text-ink">{t("Events for you")}</h2><p className="mt-1 text-xs text-muted-ink">{t("Upcoming events from your network appear here.")}</p>{events.filter((event) => !event.cancelledAt && new Date(event.startsAt) >= new Date()).slice(0, 4).map((event) => <Link key={event._id} to={`/events/${event._id}`} className="mt-4 flex gap-3"><EventCover event={event} className="h-16 w-24 shrink-0 rounded-md" /><div className="min-w-0"><p className="text-xs text-muted-ink">{formatEventDate(event.startsAt, event.timezone)}</p><p className="line-clamp-2 text-sm font-medium text-ink">{event.title}</p><p className="truncate text-xs text-muted-ink">{event.organizer?.name}</p></div></Link>)}</Card>
      </aside>
    </div>
    {showForm && <CreateEventModal
      form={form}
      setForm={setForm}
      user={user}
      saving={saving}
      onSubmit={submit}
      onClose={() => !saving && setShowForm(false)}
      speakerQuery={speakerQuery}
      setSpeakerQuery={setSpeakerQuery}
      speakerResults={speakerResults}
    />}
    {announcementEvent && <EventAnnouncementModal
      event={announcementEvent}
      user={user}
      onClose={() => setAnnouncementEvent(null)}
      onPost={async (text) => {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("eventId", announcementEvent._id);
        try {
          const { data: post } = await api.post("/posts", formData);
          setPostSuccess({ eventId: announcementEvent._id, postId: post._id });
          setAnnouncementEvent(null);
          toast.success("Event post published");
        } catch (error) {
          toast.error(error.response?.data?.message || "Unable to publish event post");
          throw error;
        }
      }}
    />}
    {postSuccess && <EventPostSuccessModal
      onClose={() => setPostSuccess(null)}
      onViewPost={() => {
        const { postId } = postSuccess;
        setPostSuccess(null);
        navigate(`/feed?postId=${postId}`);
      }}
      onSetupEvent={() => {
        const { eventId } = postSuccess;
        setPostSuccess(null);
        navigate(`/events/${eventId}`);
      }}
    />}
  </main>;
}

function EventListItem({ event, onRsvp }) {
  const past = new Date(event.startsAt) < new Date();
  return <article className="flex flex-col gap-3 px-5 py-5 sm:flex-row">
    <Link to={`/events/${event._id}`} className="h-16 w-16 shrink-0"><EventCover event={event} className="h-16 w-16 rounded-md" /></Link>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2"><Link to={`/events/${event._id}`} className="font-semibold text-ink hover:underline">{event.title}</Link>{event.isOrganizer && <span className="text-xs text-muted-ink">· Organizer</span>}</div>
      <p className={`mt-1 text-sm ${event.cancelledAt ? "font-medium text-red-700" : "text-muted-ink"}`}>{event.cancelledAt ? "Cancelled" : past ? "Past" : "Upcoming"} · {formatEventDate(event.startsAt, event.timezone)}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-ink">{event.isOnline ? <MonitorPlay size={15} /> : <MapPin size={15} />}{event.isOnline ? "Online" : event.location || "In person"}<span>· By {event.organizer?.name || "CareerLink member"}</span></p>
      {event.speakers?.length > 0 && <p className="mt-1 text-xs text-muted-ink">Speakers: {event.speakers.map((speaker) => speaker.name).join(", ")}</p>}
    </div>
    {!event.isOrganizer && !past && !event.cancelledAt && <button type="button" onClick={() => onRsvp(event._id)} className={`self-start rounded-full px-4 py-2 text-sm font-semibold sm:self-center ${event.isAttending ? "border border-gray-300 text-ink hover:bg-gray-50" : "bg-brand text-white hover:bg-brand-hover"}`}>{event.isAttending ? "Going" : "Attend"}</button>}
    {event.isOrganizer && <Link to={`/events/${event._id}`} className="self-start rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-gray-50 sm:self-center">Manage</Link>}
  </article>;
}

function CreateEventModal({ form, setForm, user, saving, onSubmit, onClose, speakerQuery, setSpeakerQuery, speakerResults }) {
  const update = (patch) => setForm((current) => ({ ...current, ...patch }));
  const selectedSpeakers = form.speakers;
  const chooseSpeaker = (speaker) => {
    if (!selectedSpeakers.some((item) => item._id === speaker._id)) update({ speakers: [...selectedSpeakers, speaker] });
    setSpeakerQuery("");
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="text-xl font-semibold text-ink">Create an event</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><X size={21} /></button></header>
      <div className="overflow-y-auto">
        <CoverImageUpload file={form.coverImage} onChange={(coverImage) => update({ coverImage })} />
        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-lg border border-gray-300 px-3 py-2.5"><p className="text-xs text-muted-ink">Organizer</p><div className="mt-1 flex items-center gap-2"><ProfileAvatar user={user} size={30} /><span className="text-sm font-medium text-ink">{user?.name || "You"}</span></div></div>
          <fieldset><legend className="text-sm font-medium text-ink">Event type</legend><div className="mt-2 flex gap-6">{[["online", "Online"], ["in-person", "In person"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="eventType" value={value} checked={form.eventType === value} onChange={() => update({ eventType: value })} className="h-4 w-4 accent-emerald-700" />{label}</label>)}</div></fieldset>
          <label className="block text-sm font-medium text-ink">Event name*<input required maxLength={75} value={form.title} onChange={(event) => update({ title: event.target.value })} className={fieldClass} /><span className="mt-1 block text-right text-xs text-muted-ink">{form.title.length}/75</span></label>
          <label className="block text-sm font-medium text-ink">Timezone*<select required value={form.timezone} onChange={(event) => update({ timezone: event.target.value })} className={fieldClass}>{!timezoneOptions.includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}{timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezoneLabel(timezone)}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-ink">Start date and time*<input required type="datetime-local" value={form.startsAt} onChange={(event) => update({ startsAt: event.target.value })} className={fieldClass} /></label>{form.hasEnd && <label className="block text-sm font-medium text-ink">End date and time*<input required type="datetime-local" value={form.endsAt} onChange={(event) => update({ endsAt: event.target.value })} className={fieldClass} /></label>}</div>
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.hasEnd} onChange={(event) => update({ hasEnd: event.target.checked })} className="h-4 w-4 accent-emerald-700" />Add end date and time</label>
          {form.eventType === "online" ? <label className="block text-sm font-medium text-ink">External event link*<input required type="url" maxLength={1024} value={form.externalLink} onChange={(event) => update({ externalLink: event.target.value })} placeholder="https://…" className={fieldClass} /></label> : <label className="block text-sm font-medium text-ink">Location*<input required maxLength={200} value={form.location} onChange={(event) => update({ location: event.target.value })} placeholder="Venue or address" className={fieldClass} /></label>}
          <label className="block text-sm font-medium text-ink">Description<textarea maxLength={5000} rows={5} value={form.description} onChange={(event) => update({ description: event.target.value })} placeholder="Topics, schedule, and other event details" className={fieldClass} /><span className="mt-1 block text-right text-xs text-muted-ink">{form.description.length}/5,000</span></label>
          <div className="relative"><label className="block text-sm font-medium text-ink">Speakers<input value={speakerQuery} onChange={(event) => setSpeakerQuery(event.target.value)} placeholder="Search for connections" className={fieldClass} /></label><p className="mt-1 text-xs leading-5 text-muted-ink">Add people who will speak at this event.</p>{speakerResults.length > 0 && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">{speakerResults.map((speaker) => <button key={speaker._id} type="button" onClick={() => chooseSpeaker(speaker)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"><ProfileAvatar user={speaker} size={32} /><span><span className="block text-sm font-medium">{speaker.name}</span><span className="block text-xs text-muted-ink">{speaker.headline}</span></span></button>)}</div>}
            {selectedSpeakers.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedSpeakers.map((speaker) => <span key={speaker._id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-2 pr-1 text-xs"><ProfileAvatar user={speaker} size={22} />{speaker.name}<button type="button" aria-label={`Remove ${speaker.name}`} onClick={() => update({ speakers: selectedSpeakers.filter((item) => item._id !== speaker._id) })} className="rounded-full p-1 hover:bg-gray-200"><X size={13} /></button></span>)}</div>}
          </div>
          <p className="text-xs text-muted-ink">By continuing, you agree to follow CareerLink’s event policies.</p>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-4"><button type="submit" disabled={saving || !form.title.trim()} className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create event"}</button></footer>
    </form>
  </div>;
}

function CoverImageUpload({ file, onChange }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <label className="group relative grid h-44 cursor-pointer place-items-center overflow-hidden bg-[#f3f2ef] text-center sm:h-52">
    {preview ? <img src={preview} alt="Event cover preview" className="absolute inset-0 h-full w-full object-cover" /> : <span><ImagePlus size={32} className="mx-auto text-muted-ink" /><span className="mt-2 block font-medium text-ink">Upload cover image</span><span className="mt-1 block text-xs text-muted-ink">Minimum width 480 px; 16:9 recommended</span></span>}
    {preview && <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink">Change cover image</span>}
    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; event.target.value = ""; onChange(file); }} />
  </label>;
}

function EventCover({ event, className }) {
  return event.coverImage?.url
    ? <img src={event.coverImage.url} alt="" className={`${className} object-cover`} />
    : <div className={`${className} grid place-items-center bg-gradient-to-br from-sky to-violet-100 text-brand`}><CalendarDays size={24} /></div>;
}

function EventAnnouncementModal({ event, user, onClose, onPost }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (posting) return;
    try {
      setPosting(true);
      await onPost(text.trim());
    } catch {
      // The parent displays the API error and keeps the draft open.
    } finally {
      setPosting(false);
    }
  };
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget && !posting) onClose(); }}>
    <form onSubmit={submit} className="flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar user={user} size={54} />
          <div className="min-w-0"><p className="truncate text-lg font-semibold text-ink">{user?.name || "You"}</p><p className="text-sm text-muted-ink">Post to Anyone</p></div>
        </div>
        <button type="button" disabled={posting} onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"><X size={23} /></button>
      </header>
      <div className="overflow-y-auto px-5 sm:px-7">
        <label htmlFor="event-announcement-text" className="sr-only">What do you want to talk about?</label>
        <textarea id="event-announcement-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} placeholder="What do you want to talk about?" className="min-h-32 w-full resize-y border-0 py-4 text-xl text-ink outline-none placeholder:text-gray-500 focus:ring-0 sm:min-h-36 sm:text-2xl" />
        <EventPostPreview event={event} />
        <p className="pb-4 pt-2 text-right text-xs text-muted-ink">{text.length}/1,000</p>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:px-7">
        <button type="button" disabled={posting} onClick={onClose} className="text-sm font-semibold text-muted-ink hover:text-ink">Skip for now</button>
        <button type="submit" disabled={posting} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{posting ? "Posting…" : "Post"}</button>
      </footer>
    </form>
  </div>;
}

function EventPostPreview({ event }) {
  return <div className="overflow-hidden rounded-xl border border-gray-200">
    <EventCover event={event} className="aspect-video max-h-[180px] w-full object-cover sm:max-h-[230px]" />
    <div className="p-4 sm:p-5">
      <p className="text-sm font-medium text-emerald-700">{formatAnnouncementDate(event)}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="break-words font-semibold text-ink">{event.title}</h2><p className="mt-1 text-sm text-muted-ink">Event by {event.organizer?.name || "You"}</p><p className="mt-2 flex items-center gap-2 text-sm text-muted-ink">{event.isOnline ? <MonitorPlay size={16} /> : <MapPin size={16} />}{event.isOnline ? "Online" : event.location}</p></div>
        <Link to={`/events/${event._id}`} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">View event</Link>
      </div>
    </div>
  </div>;
}

function EventPostSuccessModal({ onClose, onViewPost, onSetupEvent }) {
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="event-post-success-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
      <header className="flex justify-end px-4 pt-4"><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-600 hover:bg-gray-100"><X size={21} /></button></header>
      <div className="px-6 pb-7 text-center sm:px-9">
        <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-white"><Check size={19} strokeWidth={3} /></span>
        <h2 id="event-post-success-title" className="mt-5 text-xl font-semibold text-ink">Post successful.</h2>
        <button type="button" onClick={onViewPost} className="mt-2 text-base font-medium text-brand hover:underline">View post</button>
        <div className="mt-9 rounded-lg bg-slate-50 px-4 py-4 text-left">
          <p className="font-semibold text-ink">Finish setting up your event</p>
          <p className="mt-1 text-sm text-muted-ink">Click below to view next steps</p>
        </div>
      </div>
      <footer className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 sm:px-7">
        <button type="button" onClick={onClose} className="rounded-full border border-gray-400 px-5 py-2 text-sm font-semibold text-ink hover:bg-gray-50">Not now</button>
        <button type="button" onClick={onSetupEvent} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Set up Event</button>
      </footer>
    </section>
  </div>;
}

function formatAnnouncementDate(event) {
  const options = { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };
  const start = new Intl.DateTimeFormat(undefined, options).format(new Date(event.startsAt));
  const end = event.endsAt ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(event.endsAt)) : "";
  return `${start}${end ? ` - ${end}` : ""} (${event.timezone || "local time"})`;
}

function toLocalInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value, timezone) {
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
    const valueAtZone = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    const represented = Date.UTC(Number(valueAtZone.year), Number(valueAtZone.month) - 1, Number(valueAtZone.day), Number(valueAtZone.hour), Number(valueAtZone.minute));
    const adjustment = desired - represented;
    candidate += adjustment;
    if (!adjustment) break;
  }
  return new Date(candidate).toISOString();
}

function timezoneLabel(timezone) {
  try {
    const offset = new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "shortOffset" })
      .formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
    return `(UTC${offset?.replace("GMT", "") || ""}) ${timezone.replaceAll("_", " ")}`;
  } catch {
    return timezone;
  }
}

function formatEventDate(date, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || undefined,
    timeZoneName: "short",
  }).format(new Date(date));
}
