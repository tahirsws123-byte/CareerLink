import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, FileText, Search as SearchIcon, UsersRound } from "lucide-react";
import Card from "../components/layout/Card";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import ConnectionActionButton from "../components/network/ConnectionActionButton";
import api from "../services/api.js";

const tabs = ["All", "People", "Jobs", "Posts", "Articles", "Groups"];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState({ people: [], jobs: [], posts: [], articles: [], groups: [] });
  const [activeTab, setActiveTab] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setResults({ people: [], jobs: [], posts: [], articles: [], groups: [] });
      setPage(1);
      setHasMore(false);
      setError("");
      setLoading(false);
      setSearchParams({}, { replace: true });
      return;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        setSearchParams({ q: cleanQuery }, { replace: true });
        const { data } = await api.get("/search", { params: { q: cleanQuery, page: 1 } });
        if (!ignore) {
          setResults(data.results);
          setPage(1);
          setHasMore(data.hasMore);
        }
      } catch (error) {
        if (!ignore) setError(error.response?.data?.message || "Unable to search CareerLink");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 350);

    return () => { ignore = true; window.clearTimeout(timeoutId); };
  }, [query, setSearchParams]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { data } = await api.get("/search", { params: { q: query.trim(), page: nextPage } });
      setResults((current) => Object.fromEntries(Object.keys(current).map((key) => [key, [...current[key], ...(data.results[key] || [])]])));
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load more results");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4">
            <h1 className="text-lg font-semibold text-ink">Search</h1>
            <p className="mt-1 text-sm text-muted-ink">
              Search people, jobs, posts, articles, and groups.
            </p>

            <div className="relative mt-4">
              <SearchIcon
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search CareerLink"
                className="w-full rounded bg-[#EEF3F8] py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <nav aria-label="Search categories" className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
            {tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${activeTab === tab ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{tab}</button>)}
          </nav>

          {loading && (
            <div className="px-4 py-6 text-sm text-muted-ink">
              Searching...
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-6 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && !query.trim() && (
            <div className="px-4 py-6 text-sm text-muted-ink">
              Start typing to search CareerLink members.
            </div>
          )}

          {!loading && !error && query.trim() && !hasResults(results, activeTab) && (
            <div className="px-4 py-6 text-sm text-muted-ink">
              No {activeTab === "All" ? "results" : activeTab.toLowerCase()} found for "{query.trim()}".
            </div>
          )}

          {!loading && !error && (activeTab === "All" || activeTab === "People") && results.people.length > 0 && (
            <section className="border-b border-gray-100">
              <CategoryHeading title="People" count={results.people.length} />
              <div className="divide-y divide-gray-100">
              {visibleItems(results.people, activeTab, page).map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    to={`/profile/${user.publicProfileSlug || user._id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <ProfileAvatar user={user} size={56} />

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-ink hover:underline">
                        {user.name}
                      </h2>
                      <p className="line-clamp-2 text-sm text-muted-ink">
                        {user.headline || "CareerLink member"}
                      </p>
                      {user.location && (
                        <p className="mt-1 text-xs text-muted-ink">
                          {user.location}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="shrink-0">
                    <ConnectionActionButton
                      userId={user._id}
                      initialStatus={user.connectionStatus}
                      initialConnectionId={user.connectionId}
                    />
                  </div>
                </div>
              ))}
              </div>
            </section>
          )}

          {!loading && !error && (activeTab === "All" || activeTab === "Jobs") && results.jobs.length > 0 && (
            <section className="border-b border-gray-100">
              <CategoryHeading title="Jobs" count={results.jobs.length} />
              <div className="divide-y divide-gray-100">{visibleItems(results.jobs, activeTab, page).map((job) => <article key={job._id} className="flex gap-3 px-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand"><BriefcaseBusiness size={19} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-ink">{job.title}</h2><p className="text-sm text-gray-700">{job.company} · {job.location}</p><p className="mt-1 line-clamp-2 text-xs text-muted-ink">{job.description}</p></div><Link to={`/jobs?jobId=${encodeURIComponent(job._id)}`} className="self-center shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sky">View</Link></article>)}</div>
            </section>
          )}

          {!loading && !error && (activeTab === "All" || activeTab === "Posts") && results.posts.length > 0 && (
            <section className="border-b border-gray-100">
              <CategoryHeading title="Posts" count={results.posts.length} />
              <div className="divide-y divide-gray-100">{visibleItems(results.posts, activeTab, page).map((post) => <article key={post._id} className="px-4 py-4"><Link to={`/profile/${post.author?.publicProfileSlug || post.author?._id}`} className="text-sm font-semibold text-ink hover:underline">{post.author?.name || "CareerLink member"}</Link><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{post.text}</p>{post.image?.url && <img src={post.image.url} alt="Post attachment" className="mt-3 max-h-64 rounded-xl object-cover" loading="lazy" />}</article>)}</div>
            </section>
          )}

          {!loading && !error && (activeTab === "All" || activeTab === "Articles") && results.articles.length > 0 && (
            <section className="border-b border-gray-100">
              <CategoryHeading title="Articles" count={results.articles.length} />
              <div className="divide-y divide-gray-100">{visibleItems(results.articles, activeTab, page).map((article) => <Link key={article._id} to={`/articles/${article._id}`} className="flex gap-3 px-4 py-4 hover:bg-gray-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileText size={18} /></span><span className="min-w-0"><span className="block font-semibold text-ink">{article.title}</span><span className="mt-1 block line-clamp-2 text-sm text-muted-ink">{article.excerpt || article.content}</span><span className="mt-2 block text-xs text-muted-ink">By {article.author?.name || "CareerLink member"}</span></span></Link>)}</div>
            </section>
          )}

          {!loading && !error && (activeTab === "All" || activeTab === "Groups") && results.groups.length > 0 && (
            <section>
              <CategoryHeading title="Groups" count={results.groups.length} />
              <div className="divide-y divide-gray-100">{visibleItems(results.groups, activeTab, page).map((group) => <article key={group._id} className="flex gap-3 px-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand"><UsersRound size={18} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-ink">{group.name}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-ink">{group.description}</p><p className="mt-2 text-xs text-muted-ink">{group.category} · {group.members?.length || 0} members</p></div><Link to="/groups" className="self-center shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sky">Explore</Link></article>)}</div>
            </section>
          )}
          {!loading && !error && hasMore && <div className="border-t border-gray-100 p-4 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{loadingMore ? "Loading more…" : "Load more results"}</button></div>}
        </Card>
      </div>
    </div>
  );
}

function hasResults(results, tab) {
  const keys = tab === "All" ? ["people", "jobs", "posts", "articles", "groups"] : [tab.toLowerCase()];
  return keys.some((key) => results[key]?.length > 0);
}

function visibleItems(items, tab, page) {
  return tab === "All" && page === 1 ? items.slice(0, 5) : items;
}

function CategoryHeading({ title, count }) {
  return <h2 className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-ink">{title} · {count}</h2>;
}
