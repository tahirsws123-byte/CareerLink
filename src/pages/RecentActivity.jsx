import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart3, CalendarDays, Heart, Image as ImageIcon, MessageCircle, Repeat2, Smile, ThumbsUp, Video } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import PostText from "../components/feed/PostText.jsx";
import { getUserById } from "../services/userServices.js";
import api from "../services/api.js";

const tabs = [
  ["posts", "Posts"],
  ["comments", "Comments"],
  ["videos", "Videos"],
  ["images", "Images"],
  ["events", "Events"],
  ["reactions", "Reactions"],
];

export default function RecentActivity() {
  const { userId, tab: routeTab = "posts" } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const activeTab = tabs.some(([id]) => id === routeTab) ? routeTab : "posts";

  const load = useCallback(async (nextPage = 1, append = false) => {
    const currentRequestId = ++requestId.current;
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      const { data } = await api.get(`/posts/profile/${userId}/activity`, {
        params: { tab: activeTab, page: nextPage, limit: 10 },
      });
      if (currentRequestId !== requestId.current) return;
      setItems((current) => append ? [...current, ...data.items] : data.items);
      setPage(data.page);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (requestError) {
      if (currentRequestId !== requestId.current) return;
      const message = requestError.response?.data?.message || "Unable to load activity";
      if (append) toast.error(message);
      else setError(message);
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeTab, userId]);

  useEffect(() => {
    let active = true;
    getUserById(userId)
      .then((user) => { if (active) setProfile(user); })
      .catch((requestError) => {
        if (active) toast.error(requestError.response?.data?.message || "Unable to load profile");
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5 sm:py-7">
    <div className="mx-auto grid max-w-[1412px] grid-cols-1 items-start gap-4 lg:grid-cols-[272px_minmax(0,692px)_minmax(280px,1fr)] lg:gap-5">
      <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {profile?.coverPicture ? <img src={profile.coverPicture} alt="" className="h-20 w-full object-cover" /> : <div className="h-20 bg-gradient-to-r from-blue-500 to-sky-300" />}
        <div className="px-4 pb-4">
          <div className="-mt-8"><ProfileAvatar user={profile || {}} size={72} className="border-4 border-white" /></div>
          <Link to={`/profile/${profile?._id || userId}`} className="mt-2 block truncate text-lg font-semibold text-ink hover:underline">{profile?.name || "Member"}</Link>
          <p className="mt-1 line-clamp-2 text-sm text-muted-ink">{profile?.headline || "CareerLink member"}</p>
        </div>
        <Link to="/network/following" className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-muted-ink hover:bg-gray-50"><span>Followers</span><span className="font-semibold text-brand">{Number(profile?.followersCount ?? profile?.followers?.length ?? 0).toLocaleString()}</span></Link>
      </aside>

      <main className="min-w-0">
        <Card className="overflow-hidden">
          <header className="px-5 pb-4 pt-6 sm:px-7">
            <h1 className="text-2xl font-semibold text-ink">All activity</h1>
            <nav aria-label="Activity categories" className="mt-3 flex flex-wrap gap-2">
              {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => navigate(`/profile/${userId}/recent-activity/${id}`)} aria-pressed={activeTab === id} className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === id ? "bg-emerald-800 text-white" : "border border-gray-300 bg-white text-ink hover:border-emerald-800"}`}>{label}</button>)}
            </nav>
          </header>
          {!loading && !error && <p className="border-t border-gray-100 px-5 py-3 text-xs text-muted-ink">{total.toLocaleString()} {tabs.find(([id]) => id === activeTab)?.[1].toLowerCase()}</p>}
          {loading && <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-gray-100" />)}</div>}
          {!loading && error && <div role="alert" className="p-8 text-center text-sm text-red-700">{error}<button type="button" onClick={() => load()} className="ml-2 font-semibold underline">Try again</button></div>}
          {!loading && !error && items.length === 0 && <div className="px-5 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky text-brand">{iconForTab(activeTab)}</div><h2 className="mt-3 font-semibold text-ink">No {tabs.find(([id]) => id === activeTab)?.[1].toLowerCase()} yet</h2><p className="mt-1 text-sm text-muted-ink">Activity in this category will appear here.</p></div>}
          {!loading && !error && items.length > 0 && <div className="space-y-3 bg-[#f8fafc] p-3 sm:p-4">
            {items.map((item) => <ActivityItem key={`${item.type}-${item.post?._id || item.comment?._id || item.event?._id}`} item={item} tab={activeTab} userId={userId} />)}
            {hasMore && <div className="py-2 text-center"><button type="button" disabled={loadingMore} onClick={() => load(page + 1, true)} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{loadingMore ? "Loading…" : "Load more activity"}</button></div>}
          </div>}
        </Card>
      </main>

      <aside className="hidden lg:block">
        <Card className="p-5"><h2 className="font-semibold text-ink">All activity</h2><p className="mt-2 text-sm leading-6 text-muted-ink">Posts, comments, media, events and reactions shared by {profile?.name || "this member"}.</p><Link to={`/profile/${profile?._id || userId}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">View profile</Link></Card>
      </aside>
    </div>
  </div>;
}

function ActivityItem({ item, tab, userId }) {
  if (item.type === "event") {
    const event = item.event;
    const ended = new Date(event.endsAt || event.startsAt) < new Date();
    return <Link to={`/events/${event._id}`} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-brand">
      {event.coverImage?.url ? <img src={event.coverImage.url} alt="" className="h-24 w-32 shrink-0 rounded-md object-cover" /> : <div className="grid h-24 w-32 shrink-0 place-items-center rounded-md bg-sky text-brand"><CalendarDays size={28} /></div>}
      <div className="min-w-0 self-center"><p className={`text-sm ${event.cancelledAt ? "font-medium text-red-700" : "text-muted-ink"}`}>{event.cancelledAt ? "Event cancelled" : ended ? "Event ended" : "Event upcoming"}</p><h2 className="mt-1 truncate text-lg font-semibold text-ink">{event.title}</h2><p className="mt-1 text-sm text-muted-ink">{event.isOnline ? "Online event" : event.location || "In person"}</p><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink"><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{new Date(event.startsAt).toLocaleDateString()}</span><span>{event.attendees?.length || 0} attendees</span></p></div>
    </Link>;
  }

  if (item.type === "comment") {
    const comment = item.comment;
    return <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3"><ProfileAvatar user={comment.author || {}} size={40} /><div><p className="text-sm font-semibold text-ink">{comment.author?.name || "Member"} commented</p><time className="text-xs text-muted-ink">{new Date(comment.createdAt).toLocaleString()}</time></div></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{comment.text}</p>
      {comment.event ? <Link to={`/events/${comment.event._id}`} className="mt-3 block rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-brand"><p className="text-xs text-muted-ink">Commented on event</p><p className="mt-1 text-sm font-semibold text-ink">{comment.event.title}</p></Link> : comment.post && <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-muted-ink">On {comment.post.author?.name || "a member"}’s post</p>{comment.post.text && <p className="mt-1 line-clamp-3 text-sm text-ink">{comment.post.text}</p>}{comment.post.image?.url && <img src={comment.post.image.url} alt="Post" className="mt-2 max-h-48 rounded-md object-contain" />}{comment.post.video?.url && <video src={comment.post.video.url} controls className="mt-2 max-h-48 rounded-md bg-black" />}</div>}
    </article>;
  }

  const post = item.post;
  const original = post.repostOf || post;
  const author = original.author || post.author;
  const group = original.group || post.group;
  const currentReaction = post.reactions?.find((reaction) => (reaction.user?._id || reaction.user)?.toString() === userId);
  const liked = post.likes?.some((id) => (id?._id || id)?.toString() === userId);
  const myReaction = currentReaction?.emoji || (liked ? "👍" : "");
  const isOwnActivity = post.author?._id?.toString() === userId || post.repostedBy?.toString() === userId;
  return <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    {(tab === "reactions" || tab === "posts") && <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-muted-ink">{tab === "reactions" ? <><span className="text-base">{myReaction || "👍"}</span>Reacted to this post</> : isOwnActivity ? post.repostOf ? <><Repeat2 size={14} />Reposted this post</> : "Your post" : <><ThumbsUp size={14} />You liked this post</>}</div>}
    {group && <Link to={`/groups/${group._id}`} className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100">
      {group.image?.url && <img src={group.image.url} alt="" className="h-7 w-7 rounded object-cover" />}
      <span className="min-w-0 truncate text-xs font-semibold text-ink">Posted in {group.name}</span>
    </Link>}
    <div className="flex items-center gap-3 px-4 py-3"><Link to={`/profile/${author?.publicProfileSlug || author?._id}`}><ProfileAvatar user={author} size={42} /></Link><div className="min-w-0"><Link to={`/profile/${author?.publicProfileSlug || author?._id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{author?.name || "CareerLink member"}</Link><p className="text-xs text-muted-ink">{author?.headline || "CareerLink member"}</p><time className="text-[11px] text-muted-ink">{new Date(post.createdAt).toLocaleString()}</time></div></div>
    {post.text && <div className="px-4 pb-3 text-sm leading-6 text-ink"><PostText text={post.text} /></div>}
    {original.event && <Link to={`/events/${original.event._id}`} className="mx-4 mb-3 flex overflow-hidden rounded-lg border border-gray-200 hover:border-brand">
      {original.event.coverImage?.url && <img src={original.event.coverImage.url} alt="" className="h-20 w-24 shrink-0 object-cover" />}
      <div className="min-w-0 p-3"><p className="text-xs font-medium text-emerald-700">Event</p><p className="truncate text-sm font-semibold text-ink">{original.event.title}</p><p className="mt-1 text-xs text-muted-ink">{new Date(original.event.startsAt).toLocaleDateString()} · {original.event.isOnline ? "Online" : original.event.location || "In person"}</p></div>
    </Link>}
    {original.poll?.question && <section className="mx-4 mb-3 rounded-xl border border-gray-200 p-4" aria-label="Post poll">
      <h3 className="flex items-center gap-2 font-semibold text-ink"><BarChart3 size={18} className="text-brand" />{original.poll.question}</h3>
      <div className="mt-3 space-y-2">{original.poll.options?.map((option) => {
        const votes = option.votes?.length || 0;
        const totalVotes = original.poll.options.reduce((count, item) => count + (item.votes?.length || 0), 0);
        const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
        const voted = option.votes?.some((voter) => (voter?._id || voter)?.toString() === userId);
        return <div key={option._id || option.text} className={`relative flex min-h-10 items-center justify-between overflow-hidden rounded-lg border px-3 py-2 text-sm ${voted ? "border-brand" : "border-gray-300"}`}>
          {totalVotes > 0 && <span className="absolute inset-y-0 left-0 bg-sky/70" style={{ width: `${percentage}%` }} />}
          <span className="relative z-[1]">{option.text}{voted ? " · Your vote" : ""}</span>
          {totalVotes > 0 && <span className="relative z-[1] font-medium">{percentage}%</span>}
        </div>;
      })}</div>
      <p className="mt-3 text-xs text-muted-ink">{original.poll.options?.reduce((count, option) => count + (option.votes?.length || 0), 0) || 0} votes{original.poll.expiresAt ? ` · Ends ${new Date(original.poll.expiresAt).toLocaleDateString()}` : ""}</p>
    </section>}
    {post.image?.url && <img src={post.image.url} alt="Post attachment" loading="lazy" className="max-h-[560px] w-full bg-gray-50 object-contain" />}
    {post.video?.url && <video src={post.video.url} controls className="max-h-[560px] w-full bg-black" />}
    {post.repostOf && <div className="mx-4 mb-3 rounded-lg border border-gray-200 p-3">{original.text && <p className="text-sm text-ink">{original.text}</p>}{original.image?.url && <img src={original.image.url} alt="Reposted image" loading="lazy" className="mt-2 max-h-80 object-contain" />}{original.video?.url && <video src={original.video.url} controls className="mt-2 max-h-80 bg-black" />}</div>}
    <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-4 py-3 text-xs text-muted-ink"><span className="inline-flex items-center gap-1"><ThumbsUp size={14} />{post.likes?.length || 0} likes</span>{post.reactions?.length > 0 && <span className="inline-flex items-center gap-1"><Smile size={14} />{post.reactions.length} reactions</span>}<span className="inline-flex items-center gap-1"><MessageCircle size={14} />{post.commentsCount || 0} comments</span>{post.event && <Link to={`/events/${post.event._id}`} className="text-brand hover:underline">View event</Link>}</div>
  </article>;
}

function iconForTab(tab) {
  if (tab === "comments") return <MessageCircle size={21} />;
  if (tab === "videos") return <Video size={21} />;
  if (tab === "images") return <ImageIcon size={21} />;
  if (tab === "events") return <CalendarDays size={21} />;
  if (tab === "reactions") return <Heart size={21} />;
  return <Repeat2 size={21} />;
}
