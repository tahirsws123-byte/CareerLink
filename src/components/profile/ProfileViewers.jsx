import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Send } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import ProfileAvatar from "../layout/ProfileAvatar.jsx";
import ConnectionActionButton from "../network/ConnectionActionButton.jsx";
import api from "../../services/api.js";
import { createOrGetConversation } from "../../services/messageServices.js";

const PAGE_SIZE = 20;

export default function ProfileViewers({ fullPage = false }) {
  const [viewers, setViewers] = useState([]);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagingId, setMessagingId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setPage(1);
    setLoading(true);
    api.get("/users/profile-views/mine", {
      params: { page: 1, limit: PAGE_SIZE, sort },
    })
      .then(({ data }) => {
        if (!active) return;
        setViewers(data.viewers || []);
        setTotal(data.total || 0);
        setHasMore(Boolean(data.hasMore));
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Unable to load profile viewers");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [sort]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { data } = await api.get("/users/profile-views/mine", {
        params: { page: nextPage, limit: PAGE_SIZE, sort },
      });
      setViewers((current) => [...current, ...(data.viewers || [])]);
      setPage(nextPage);
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load more viewers");
    } finally {
      setLoadingMore(false);
    }
  };

  const messageViewer = async (viewer) => {
    try {
      setMessagingId(viewer._id);
      const conversation = await createOrGetConversation(viewer._id);
      navigate(`/messages/${conversation._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to open this conversation");
    } finally {
      setMessagingId("");
    }
  };

  const entries = fullPage ? viewers : viewers.slice(0, 5);
  return <Card className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2"><Eye size={18} className="text-brand" /><div><h2 className="text-sm font-semibold text-ink">{fullPage ? "Who viewed your profile" : "Who viewed your profile"}</h2><p className="mt-0.5 text-xs text-muted-ink">{fullPage ? `${total.toLocaleString()} signed-in visitors · Each member appears once` : "Signed-in visitors only"}</p></div></div>
      {fullPage && <label className="text-xs font-medium text-muted-ink">Sort
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="ml-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700"><option value="recent">Most recent</option><option value="oldest">Oldest</option></select>
      </label>}
    </div>
    {loading ? <p className="border-t border-gray-100 px-4 py-5 text-sm text-muted-ink">Loading viewers…</p>
      : entries.length ? <div className="divide-y divide-gray-100 border-t border-gray-100">
        {entries.map((entry) => {
          if (!entry.viewer) return null;
          const viewer = entry.viewer;
          return <article key={entry._id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <Link to={`/profile/${viewer.publicProfileSlug || viewer._id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <ProfileAvatar user={viewer} size={48} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{viewer.name}</span><span className="block truncate text-xs text-muted-ink">{viewer.headline || "CareerLink member"}</span><span className="mt-1 block text-[11px] text-muted-ink">Viewed {relativeTime(entry.lastViewedAt)}</span></span>
            </Link>
            {fullPage && <div className="flex flex-wrap items-center gap-2 pl-[60px] sm:pl-0">
              <button type="button" disabled={messagingId === viewer._id} onClick={() => messageViewer(viewer)} className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand disabled:opacity-50"><Send size={13} />{messagingId === viewer._id ? "Opening…" : "Message"}</button>
              <ConnectionActionButton userId={viewer._id} />
            </div>}
          </article>;
        })}
        {!fullPage && total > 5 && <Link to="/dashboard/profile-views" className="flex w-full justify-center border-t border-gray-100 px-4 py-3 text-sm font-semibold text-brand hover:bg-gray-50">Show all {total} viewers →</Link>}
        {fullPage && hasMore && <div className="border-t border-gray-100 px-4 py-4 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{loadingMore ? "Loading…" : "Load more viewers"}</button></div>}
      </div>
      : <p className="border-t border-gray-100 px-4 py-5 text-sm text-muted-ink">No signed-in visitors yet. Profile visits from signed-in CareerLink members will appear here.</p>}
  </Card>;
}

function relativeTime(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}
