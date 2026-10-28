import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  Newspaper,
  UsersRound,
  UserRound,
  UsersRound as GroupsIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import api from "../services/api.js";

const pageSize = 32;

export default function DiscoverPages() {
  const [pages, setPages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [networkCounts, setNetworkCounts] = useState({
    connections: 0,
    followingFollowers: 0,
    groups: 0,
    events: 0,
    pages: 0,
    newsletters: 0,
  });
  const [peopleTotal, setPeopleTotal] = useState(0);
  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);

  const loadPages = useCallback(async (reset = false) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    setError("");
    if (reset) setLoading(true);
    else setLoadingMore(true);
    const pageToLoad = reset ? 0 : pageRef.current;
    try {
      const { data } = await api.get("/users/pages/discover", {
        params: { page: pageToLoad, limit: pageSize },
      });
      setPages((current) => reset ? data.pages || [] : [...current, ...(data.pages || [])]);
      setPeopleTotal(Number(data.total) || 0);
      pageRef.current = pageToLoad + 1;
      hasMoreRef.current = Boolean(data.hasMore);
      setHasMore(hasMoreRef.current);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load pages");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPages(true);
  }, [loadPages]);

  useEffect(() => {
    Promise.all([
      api.get("/connections/summary"),
      api.get("/users/following"),
      api.get("/users/followers"),
    ]).then(([summaryResponse, followingResponse, followersResponse]) => {
      const summary = summaryResponse.data;
      setNetworkCounts((current) => ({
        ...current,
        connections: summary.connections?.length || 0,
        followingFollowers: (followingResponse.data.users?.length || 0) + (followersResponse.data.users?.length || 0),
        groups: summary.communityCounts?.groups || 0,
        events: summary.communityCounts?.events || 0,
        newsletters: summary.communityCounts?.newsletters || 0,
      }));
    }).catch((requestError) => {
      toast.error(requestError.response?.data?.message || "Unable to load network counts");
    });
  }, []);

  const toggleFollow = async (pageUser) => {
    if (actionId) return;
    try {
      setActionId(pageUser._id);
      const { data } = await api.post(`/users/follow/${pageUser._id}`);
      setPages((current) => current.map((item) => item._id === pageUser._id
        ? {
          ...item,
          isFollowing: data.following,
          followerCount: Math.max(0, item.followerCount + (data.following ? 1 : -1)),
        }
        : item));
      toast.success(data.following ? `Following ${pageUser.name}` : `Unfollowed ${pageUser.name}`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update follow status");
    } finally {
      setActionId("");
    }
  };

  const featuredPages = pages.slice(0, 4);
  const otherPages = pages.slice(4);

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-3 py-5 sm:px-5">
      <div className="mx-auto grid max-w-[1128px] items-start gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <Card className="overflow-hidden">
            <h1 className="border-b border-gray-100 px-4 py-4 text-sm font-semibold text-ink">Manage my network</h1>
            <nav aria-label="Manage my network" className="p-2">
              <NetworkLink to="/network/connections" icon={UsersRound} label="Connections" count={networkCounts.connections} />
              <NetworkLink to="/network/following" icon={UserRound} label="Following & followers" count={networkCounts.followingFollowers} />
              <NetworkLink to="/groups" icon={GroupsIcon} label="Groups" count={networkCounts.groups} />
              <NetworkLink to="/events" icon={CalendarDays} label="Events" count={networkCounts.events} />
              <NetworkLink to="/network/pages" icon={FileText} label="Pages" count={networkCounts.pages} />
              <NetworkLink to="/newsletters" icon={Newspaper} label="Newsletters" count={networkCounts.newsletters} />
            </nav>
          </Card>
        </aside>

        <main className="min-w-0 space-y-4">
          <Card className="min-h-32 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-ink sm:text-lg">Pages</h2>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink sm:text-lg">People to follow</h2>
                <p className="mt-1 text-xs text-muted-ink sm:text-sm">Discover and follow people from across CareerLink.</p>
              </div>
              <a href="#all-pages" className="shrink-0 text-sm font-semibold text-ink hover:text-brand">See all</a>
            </div>
            {loading ? <p className="py-10 text-center text-sm text-muted-ink">Loading pages…</p> : featuredPages.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {featuredPages.map((pageUser) => <PageCard key={pageUser._id} pageUser={pageUser} actionId={actionId} onToggleFollow={toggleFollow} />)}
              </div>
            ) : !error ? <p className="py-8 text-center text-sm text-muted-ink">No accounts to show yet.</p> : null}
          </Card>

          <Card id="all-pages" className="scroll-mt-20 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-base font-semibold text-ink sm:text-lg">People across CareerLink</h2><p className="mt-1 text-xs text-muted-ink sm:text-sm">{peopleTotal.toLocaleString()} accounts</p></div>
              <Link to="/network/pages" className="shrink-0 text-sm font-semibold text-ink hover:text-brand">Following</Link>
            </div>
            {otherPages.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {otherPages.map((pageUser) => <PageCard key={pageUser._id} pageUser={pageUser} actionId={actionId} onToggleFollow={toggleFollow} />)}
            </div>}
            {error && <p role="alert" className="py-5 text-center text-sm text-red-600">{error}</p>}
            {loadingMore && <p className="py-5 text-center text-sm text-muted-ink">Loading more pages…</p>}
            {!loading && pages.length === 0 && error && <button type="button" onClick={() => loadPages(true)} className="mx-auto mt-3 block text-sm font-semibold text-brand hover:underline">Try again</button>}
            {hasMore && !loading && <button type="button" disabled={loadingMore} onClick={() => loadPages()} className="mx-auto mt-5 block rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-60">{loadingMore ? "Loading…" : "Load more pages"}</button>}
            {!hasMore && pages.length > 0 && <p className="py-5 text-center text-xs text-muted-ink">You’ve reached all job-poster accounts.</p>}
          </Card>
        </main>
      </div>
    </div>
  );
}

function NetworkLink({ to, icon: Icon, label, count }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink transition hover:bg-sky hover:font-semibold hover:text-brand">
      <Icon size={18} className="shrink-0 text-muted-ink group-hover:text-brand" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums text-muted-ink group-hover:text-brand">{Number(count || 0).toLocaleString()}</span>
    </Link>
  );
}

function PageCard({ pageUser, actionId, onToggleFollow }) {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white text-center">
      <div className="h-16 bg-gradient-to-br from-[#153250] via-[#187a91] to-[#c5d7d4]" />
      <Link to={`/profile/${pageUser._id}`} className="-mt-8 flex flex-col items-center px-3">
        <ProfileAvatar user={pageUser} size={64} className="rounded-lg border-4 border-white bg-white shadow-sm" />
        <h3 className="mt-2 line-clamp-1 min-h-5 w-full text-sm font-semibold text-ink hover:underline">{pageUser.name || "CareerLink account"}</h3>
        <p className="mt-1 line-clamp-2 min-h-9 w-full text-xs text-muted-ink">{pageUser.headline || "Job poster on CareerLink"}</p>
      </Link>
      <p className="mt-1 text-[11px] text-muted-ink">{Number(pageUser.followerCount || 0).toLocaleString()} followers{pageUser.location ? ` · ${pageUser.location}` : ""}</p>
      <div className="p-3">
        <button type="button" disabled={actionId === pageUser._id} aria-pressed={pageUser.isFollowing} onClick={() => onToggleFollow(pageUser)} className={`w-full rounded-full border px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${pageUser.isFollowing ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-blue-600 text-blue-700 hover:bg-blue-50"}`}>
          {actionId === pageUser._id ? "Please wait…" : pageUser.isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </article>
  );
}
