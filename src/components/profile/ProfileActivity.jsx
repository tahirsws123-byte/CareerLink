import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Repeat2, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import api from "../../services/api.js";
import useAuth from "../../hooks/useAuth.js";

export default function ProfileActivity({ user }) {
  const { user: authUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api.get(`/posts/profile/${user._id}`)
      .then(({ data }) => { if (!ignore) setPosts(data); })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || "Unable to load profile activity");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [user._id]);

  const visiblePosts = expanded ? posts : posts.slice(0, 3);

  return <Card id="activity" className="overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-4"><div><h2 className="text-lg font-semibold text-ink">Activity</h2><p className="mt-1 text-xs text-muted-ink">{user.followersCount ?? user.followers?.length ?? 0} followers · Posts and reposts</p></div><div className="flex items-center gap-2">{authUser?._id === user._id && <Link to="/feed" className="rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sky">Create a post</Link>}<Link to={`/profile/${user._id}/recent-activity/posts`} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gray-50">All activity</Link></div></div>
    {loading ? <p className="border-t border-gray-100 px-5 py-5 text-sm text-muted-ink">Loading activity…</p> : posts.length === 0 ? <div className="border-t border-gray-100 px-5 py-6"><p className="text-sm text-muted-ink">{authUser?._id === user._id ? "Your posts and reposts will appear here." : "No public activity yet."}</p>{authUser?._id === user._id && <Link to="/feed" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Share your first post</Link>}</div> : <><div className="grid gap-3 border-t border-gray-100 p-4 md:grid-cols-2">{visiblePosts.map((post) => {
      const original = post.repostOf || post;
      return <article key={post._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="flex items-center gap-2 px-3 py-3"><div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sky text-xs font-semibold text-brand">{post.author?.profilePicture ? <img src={post.author.profilePicture} alt="" className="h-full w-full object-cover" /> : post.author?.name?.slice(0, 1) || "U"}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{post.author?.name || user.name}</p><p className="text-[11px] text-muted-ink">{post.repostOf ? "Reposted" : "Posted"} · {new Date(post.createdAt).toLocaleDateString()}</p></div></div>{post.text && <p className="line-clamp-4 px-3 pb-3 text-sm leading-5 text-gray-700">{post.text}</p>}{original.image?.url && <img src={original.image.url} alt="Post attachment" loading="lazy" className="max-h-72 w-full object-cover" />}{original.video?.url && <video src={original.video.url} controls className="max-h-72 w-full bg-black" />}{post.repostOf?.text && <p className="line-clamp-3 px-3 py-3 text-sm text-gray-700">{post.repostOf.text}</p>}<div className="flex items-center gap-4 border-t border-gray-100 px-3 py-2 text-xs text-muted-ink"><span className="inline-flex items-center gap-1"><ThumbsUp size={13} />{post.likes?.length || 0}</span><span className="inline-flex items-center gap-1"><MessageCircle size={13} />{post.commentsCount || 0}</span><span className="inline-flex items-center gap-1"><Repeat2 size={13} />{post.repostedBy ? "Repost" : "Post"}</span></div></article>;
    })}</div>{posts.length > 3 && <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full border-t border-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">{expanded ? "Show less" : `Show all ${posts.length} activities`} →</button>}</>}
  </Card>;
}
