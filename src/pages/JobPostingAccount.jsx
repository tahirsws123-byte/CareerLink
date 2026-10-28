import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, MoreHorizontal, Plus, UsersRound, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";

export default function JobPostingAccount() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({ posts: 0, articles: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [updatingJob, setUpdatingJob] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [jobsResponse, postsResponse, articlesResponse] = await Promise.all([
        api.get("/jobs/mine"),
        api.get("/posts/saved"),
        api.get("/articles/saved"),
      ]);
      setJobs(jobsResponse.data.jobs || []);
      setCounts({ posts: postsResponse.data.savedPosts?.length || 0, articles: articlesResponse.data.articles?.length || 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your job posting account");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (job) => {
    const status = job.status === "closed" ? "open" : "closed";
    if (status === "closed" && !window.confirm(`Close “${job.title}”? Candidates will no longer be able to apply.`)) return;
    try {
      setUpdatingJob(job._id);
      const { data } = await api.patch(`/jobs/manage/${job._id}/status`, { status });
      setJobs((items) => items.map((item) => item._id === job._id ? { ...item, ...data.job } : item));
      setOpenMenu("");
      toast.success(status === "closed" ? "Job closed" : "Job reopened");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update job status");
    } finally {
      setUpdatingJob("");
    }
  };

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5">
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h1 className="flex items-center gap-2 border-b border-gray-100 px-4 py-4 font-semibold text-ink"><Bookmark size={17} />My items</h1>
        <button type="button" className="flex w-full items-center justify-between border-l-4 border-brand bg-sky/40 px-3 py-3 text-left text-sm font-semibold text-brand"><span>Posted jobs</span><span>{jobs.length}</span></button>
        <Link to="/saved" className="flex items-center justify-between border-l-4 border-transparent px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand"><span>Saved posts and articles</span><span>{counts.posts + counts.articles}</span></Link>
      </aside>

      <main className="min-w-0">
        <header className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-brand">Employer workspace</p><h2 className="mt-1 text-2xl font-bold text-ink">Posted jobs</h2><p className="mt-1 text-sm text-muted-ink">Manage your openings and review candidate activity.</p></div>
          <Link to="/jobs?post=true" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"><Plus size={17} />Post a job</Link>
        </header>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Try again</button></div>}
        {loading && <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-muted-ink">Loading your jobs…</div>}
        {!loading && !error && jobs.length === 0 && <section className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky text-brand"><BriefcaseBusiness size={25} /></div><h3 className="mt-4 text-lg font-semibold text-ink">Your first hire starts here</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-ink">Post a role to reach relevant candidates, manage applicants, and keep every hiring step in one place.</p><Link to="/jobs?post=true" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Post a job</Link></section>}
        {!loading && !error && jobs.length > 0 && <section className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold text-ink">Your job posts</h3><span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">{jobs.some((job) => job.status !== "closed") ? "Active" : "Closed"}</span></div><p className="mt-1 text-sm text-muted-ink">Select a job to manage its hiring plan and applicants.</p></div>
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => <article key={job._id} className="relative flex gap-3 px-4 py-5 sm:px-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><BriefcaseBusiness size={24} /></div>
              <button type="button" onClick={() => navigate(`/jobs/manage/${job._id}`)} className="min-w-0 flex-1 text-left">
                <span className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-ink hover:text-brand">{job.title}</span>{job.status === "closed" && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">Closed</span>}</span>
                <span className="mt-0.5 block truncate text-sm text-gray-700">{job.company}</span>
                <span className="mt-1 block truncate text-xs text-muted-ink">{job.location} · {job.workMode}</span>
                <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${job.status === "closed" ? "text-gray-600" : "text-emerald-700"}`}>{job.status === "closed" ? <><XCircle size={13} />Closed</> : <><CheckCircle2 size={13} />Open</>}<span className="font-normal text-muted-ink">· Posted {timeAgo(job.createdAt)} · {job.applicantCount || 0} applicants</span></span>
              </button>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setOpenMenu(openMenu === job._id ? "" : job._id)} aria-label={`Options for ${job.title}`} className="grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100"><MoreHorizontal size={20} /></button>
                {openMenu === job._id && <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                  <button type="button" onClick={() => navigate(`/jobs/manage/${job._id}`)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Manage job</button>
                  <button type="button" onClick={() => { setOpenMenu(""); navigate(`/jobs/view/${job._id}`); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">View as candidate</button>
                  <button type="button" disabled={updatingJob === job._id} onClick={() => changeStatus(job)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50">{updatingJob === job._id ? "Updating…" : job.status === "closed" ? "Reopen job" : "Close job"}</button>
                </div>}
              </div>
            </article>)}
          </div>
        </section>}
      </main>

      <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound size={20} /></div>
        <h3 className="mt-3 font-semibold text-ink">Hiring at a glance</h3>
        <p className="mt-1 text-sm leading-6 text-muted-ink">Keep your job posts current and review applicants from each hiring plan.</p>
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm"><p className="flex items-center justify-between text-gray-700"><span><Clock3 className="mr-2 inline" size={15} />Open jobs</span><strong>{jobs.filter((job) => job.status !== "closed").length}</strong></p><p className="flex items-center justify-between text-gray-700"><span><UsersRound className="mr-2 inline" size={15} />Applicants</span><strong>{jobs.reduce((sum, job) => sum + Number(job.applicantCount || 0), 0)}</strong></p></div>
      </aside>
    </div>
  </div>;
}

function timeAgo(value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
