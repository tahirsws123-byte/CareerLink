import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Repeat2, ThumbsUp, Heart, Smile, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import ProfileCard from "../components/feed/ProfileCard.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import PostText from "../components/feed/PostText.jsx";
import api from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

const tabs = [
  { id: "posts", label: "Posts" },
  { id: "reactions", label: "Reactions" },
];

export default function MyActivity() {
  const { user } = useAuth();
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const loadActivity = useCallback(async (nextPage = 1, append = false) => {
    const currentRequestId = ++requestId.current;
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      const { data } = await api.get("/posts/activity/mine", {
        params: { tab, page: nextPage, limit: 10 },
      });
      if (currentRequestId !== requestId.current) return;
      setPosts((current) => append ? [...current, ...data.posts] : data.posts);
      setPage(data.page);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (requestError) {
      if (currentRequestId !== requestId.current) return;
      const message = requestError.response?.data?.message || "Unable to load your activity";
      if (!append) setError(message);
      else toast.error(message);
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [tab]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5 sm:py-7">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(220px,272px)_minmax(0,1fr)] lg:gap-5">
        <aside className="lg:sticky lg:top-20"><ProfileCard variant="activity" /></aside>
        <main className="min-w-0 lg:pt-1">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
              <p className="inline-flex items-center rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">Your CareerLink activity</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">All activity</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-ink">Keep track of the posts you’ve shared and the conversations you’ve engaged with.</p>
            </header>
            <nav aria-label="Activity categories" className="flex gap-2 border-b border-gray-200 px-5 py-3">
              {tabs.map(({ id, label }) => <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-emerald-700 text-white" : "border border-gray-300 text-gray-700 hover:border-emerald-700 hover:text-emerald-800"}`}>{label}</button>)}
              {!loading && <span className="ml-auto self-center text-xs text-muted-ink">{total.toLocaleString()} {tab === "posts" ? "posts & reposts" : "reactions"}</span>}
            </nav>

            {loading && <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl bg-gray-100" />)}</div>}
            {!loading && error && <div role="alert" className="p-6 text-center text-sm text-red-600">{error}<button type="button" onClick={() => loadActivity()} className="ml-2 font-semibold underline">Try again</button></div>}
            {!loading && !error && posts.length === 0 && <div className="px-5 py-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky text-brand">{tab === "posts" ? <ImageIcon size={21} /> : <Heart size={21} />}</div>
              <h2 className="mt-3 text-base font-semibold text-ink">{tab === "posts" ? "No posts or reposts yet" : "No reactions yet"}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-ink">{tab === "posts" ? "Posts you create and posts you repost will appear here." : "Posts you like or react to will appear here."}</p>
              {tab === "posts" && <Link to="/feed" className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Create a post</Link>}
            </div>}
            {!loading && !error && posts.length > 0 && <div className="space-y-3 bg-[#f8fafc] p-3 sm:p-4">
              {posts.map((post) => <ActivityPost key={post._id} post={post} tab={tab} userId={user?._id} />)}
              {hasMore && <div className="py-2 text-center"><button type="button" disabled={loadingMore} onClick={() => loadActivity(page + 1, true)} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{loadingMore ? "Loading…" : "Load more activity"}</button></div>}
            </div>}
          </section>
        </main>
      </div>
    </div>
  );
}

function ActivityPost({ post, tab, userId }) {
  const isRepost = Boolean(post.repostOf);
  const original = post.repostOf || post;
  const author = original.author || post.author;
  const currentReaction = post.reactions?.find((reaction) => (reaction.user?._id || reaction.user)?.toString() === userId);
  const liked = post.likes?.some((id) => (id?._id || id)?.toString() === userId);
  const myReaction = currentReaction?.emoji || (liked ? "👍" : "");

  return <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    {tab === "posts" && isRepost && <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-muted-ink"><Repeat2 size={14} className="text-emerald-700" />You reposted this</div>}
    {tab === "reactions" && <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-muted-ink"><span className="text-base">{myReaction || "👍"}</span>You {myReaction && myReaction !== "👍" ? `reacted ${myReaction} to` : "liked"} this post</div>}
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/profile/${author?.publicProfileSlug || author?._id}`}><ProfileAvatar user={author} size={42} /></Link>
      <div className="min-w-0 flex-1"><Link to={`/profile/${author?.publicProfileSlug || author?._id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{author?.name || "CareerLink member"}</Link><p className="truncate text-xs text-muted-ink">{author?.headline || "CareerLink member"}</p><time className="text-[11px] text-muted-ink">{new Date(post.createdAt).toLocaleString()}</time></div>
    </div>
    {post.text && <div className="px-4 pb-3 text-sm leading-6 text-gray-800"><PostText text={post.text} /></div>}
    {post.image?.url && <img src={post.image.url} alt="Post attachment" loading="lazy" className="max-h-[560px] w-full bg-gray-50 object-contain" />}
    {post.video?.url && <video src={post.video.url} controls className="max-h-[560px] w-full bg-black" />}
    {isRepost && (original.text || original.image?.url || original.video?.url) && <div className="mx-4 mb-3 overflow-hidden rounded-lg border border-gray-200">
      {original.text && <div className="p-3 text-sm leading-5 text-gray-700"><PostText text={original.text} /></div>}
      {original.image?.url && <img src={original.image.url} alt="Reposted attachment" loading="lazy" className="max-h-[480px] w-full bg-gray-50 object-contain" />}
      {original.video?.url && <video src={original.video.url} controls className="max-h-[480px] w-full bg-black" />}
    </div>}
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 px-4 py-3 text-xs text-muted-ink">
      <span className="inline-flex items-center gap-1"><ThumbsUp size={14} />{post.likes?.length || 0} likes</span>
      {post.reactions?.length > 0 && <span className="inline-flex items-center gap-1"><Smile size={14} />{post.reactions.length} reactions</span>}
      <span className="inline-flex items-center gap-1"><MessageCircle size={14} />{post.commentsCount || 0} comments</span>
      <span className="inline-flex items-center gap-1"><Repeat2 size={14} />{post.repostedBy ? "Reposted" : "Post"}</span>
    </div>
  </article>;
}
