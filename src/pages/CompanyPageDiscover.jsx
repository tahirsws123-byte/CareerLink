import { useEffect, useState } from "react";
import { Building2, Check, Search, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api.js";

export default function CompanyPageDiscover() {
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingPageId, setUpdatingPageId] = useState("");
  const discoverablePages = pages.filter((page) => !page.isOwner);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/company-pages/discover", {
          params: search.trim() ? { search: search.trim() } : {},
        });
        if (active) setPages(data.companyPages || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to discover company pages");
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [search]);

  const toggleFollow = async (page) => {
    if (updatingPageId) return;
    try {
      setUpdatingPageId(page._id);
      const { data } = await api.post(`/company-pages/${page._id}/follow`);
      setPages((current) => current.map((item) => item._id === page._id
        ? { ...item, isFollowing: data.following, followerCount: data.followerCount }
        : item));
      toast.success(data.following ? `Following ${page.name}` : `Unfollowed ${page.name}`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update follow status");
    } finally {
      setUpdatingPageId("");
    }
  };

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5">
      <div className="mx-auto max-w-5xl">
        <Link to="/feed" className="text-sm font-semibold text-brand hover:underline">← Back to CareerLink</Link>
        <header className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Discover</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Company Pages</h1>
          <p className="mt-1 text-sm text-muted-ink">Find and follow organizations to see their updates.</p>
          <label className="relative mt-4 block max-w-xl">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company pages or industries" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
        </header>

        <section className="mt-4">
          {loading && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading company pages…</div>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-center text-sm text-red-700">{error}</div>}
          {!loading && !error && !discoverablePages.length && <div className="rounded-xl border border-gray-200 bg-white p-10 text-center"><Building2 size={30} className="mx-auto text-muted-ink" /><h2 className="mt-3 font-semibold text-ink">No company pages found</h2><p className="mt-1 text-sm text-muted-ink">{search ? "Try a different search." : "Company pages will appear here when organizations create them."}</p></div>}
          {!loading && !error && discoverablePages.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {discoverablePages.map((page) => (
                <article key={page._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="h-16 bg-gradient-to-r from-[#d6e8ed] via-[#dce6e4] to-[#e9e3d9]" />
                  <div className="px-4 pb-4">
                    <div className="-mt-7">
                      {page.logo?.url ? <img src={page.logo.url} alt="" className="h-14 w-14 rounded-lg border-4 border-white bg-white object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-lg border-4 border-white bg-sky text-brand"><Building2 size={22} /></span>}
                    </div>
                    <Link to={`/company/${page.publicUrlSlug}`} className="mt-2 block truncate font-semibold text-ink hover:text-brand hover:underline">{page.name}</Link>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-ink">{page.industry}</p>
                    <p className="mt-2 line-clamp-2 min-h-8 text-xs text-gray-600">{page.tagline || "Company Page on CareerLink"}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-ink"><UsersRound size={14} />{Number(page.followerCount || 0).toLocaleString()} followers</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={updatingPageId === page._id} aria-pressed={page.isFollowing} onClick={() => toggleFollow(page)} className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${page.isFollowing ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-brand text-brand hover:bg-sky"}`}>
                        {page.isFollowing ? <span className="inline-flex items-center gap-1"><Check size={15} />Following</span> : "Follow"}
                      </button>
                      <Link to={`/company/${page.publicUrlSlug}`} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">View</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
