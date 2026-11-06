import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, Eye, MapPin, Pencil, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api.js";
import PostJobModal from "../jobs/PostJobModal.jsx";

const jobTabs = [
  { status: "open", label: "Open" },
  { status: "draft", label: "Draft" },
  { status: "in-review", label: "In review" },
  { status: "paused", label: "Paused" },
  { status: "closed", label: "Closed" },
];

const transitions = {
  open: [["paused", "Pause"], ["in-review", "Send for review"], ["closed", "Close"]],
  draft: [["open", "Publish"], ["in-review", "Send for review"]],
  "in-review": [["open", "Publish"], ["draft", "Return to draft"]],
  paused: [["open", "Reopen"], ["closed", "Close"]],
  closed: [["open", "Reopen"]],
};

export default function CompanyPageJobs({ companyPage }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState("open");
  const [updatingId, setUpdatingId] = useState("");
  const [editingJob, setEditingJob] = useState(null);
  const [creating, setCreating] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/jobs/company-page/${companyPage._id}`);
      setJobs(data.jobs || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load Company Page jobs");
    } finally {
      setLoading(false);
    }
  }, [companyPage._id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const counts = useMemo(() => jobs.reduce((result, job) => {
    const status = job.status || "open";
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {}), [jobs]);
  const visibleJobs = jobs.filter((job) => (job.status || "open") === activeStatus);

  const changeStatus = async (job, status) => {
    if (updatingId) return;
    try {
      setUpdatingId(job._id);
      await api.patch(`/jobs/manage/${job._id}/status`, { status });
      toast.success(`Job moved to ${jobTabs.find((tab) => tab.status === status)?.label || status}`);
      await loadJobs();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update this job");
    } finally {
      setUpdatingId("");
    }
  };

  const onSaved = async () => {
    setCreating(false);
    setEditingJob(null);
    await loadJobs();
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Jobs</h2>
          <p className="mt-1 text-sm text-muted-ink">Create job posts and manage their status for {companyPage.name}.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
          <BriefcaseBusiness size={16} /> Post a job
        </button>
      </header>

      <nav aria-label="Job statuses" className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {jobTabs.map(({ status, label }) => (
          <button key={status} type="button" aria-pressed={activeStatus === status} onClick={() => setActiveStatus(status)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${activeStatus === status ? "border-brand text-brand" : "border-transparent text-gray-600 hover:text-ink"}`}>
            {label} <span className="ml-1 text-xs text-muted-ink">{counts[status] || 0}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-ink">Loading jobs…</div>
      ) : error ? (
        <div className="p-8 text-center">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={loadJobs} className="mt-3 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Try again</button>
        </div>
      ) : visibleJobs.length ? (
        <div className="divide-y divide-gray-100">
          {visibleJobs.map((job) => (
            <article key={job._id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                {companyPage.logo?.url ? <img src={companyPage.logo.url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-gray-100 object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sky text-brand"><Building2 size={22} /></span>}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-ink">{job.title}</h3>
                  <p className="mt-1 text-sm text-muted-ink">{job.company} · {job.type || "Employment type"} · {job.workMode || "Workplace"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
                    <span><MapPin className="mr-1 inline" size={13} />{job.location}</span>
                    <span><UsersRound className="mr-1 inline" size={13} />{job.applicantCount || 0} applicants</span>
                    <span><Eye className="mr-1 inline" size={13} />{job.views || 0} views</span>
                    <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "—"}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button type="button" onClick={() => setEditingJob(job)} className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
                  <Pencil size={14} /> Edit
                </button>
                {job.status === "open" && <Link to={`/jobs/manage/${job._id}`} className="rounded-full border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">Applicants</Link>}
                {(transitions[job.status || "open"] || []).map(([status, label]) => (
                  <button key={status} type="button" disabled={updatingId === job._id} onClick={() => changeStatus(job, status)} className={`rounded-full px-3.5 py-2 text-sm font-semibold disabled:opacity-50 ${status === "open" ? "bg-brand text-white hover:bg-brand-hover" : "border border-gray-300 text-gray-700 hover:border-brand hover:text-brand"}`}>
                    {updatingId === job._id ? "Updating…" : label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky text-brand"><BriefcaseBusiness size={25} /></span>
          <h3 className="mt-4 text-lg font-semibold text-ink">{activeStatus === "open" ? "No open jobs" : `No ${jobTabs.find((tab) => tab.status === activeStatus)?.label.toLowerCase()} jobs`}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-ink">{activeStatus === "open" ? "Post a job to reach candidates through your company page." : "Jobs with this status will appear here."}</p>
          {activeStatus === "open" && <button type="button" onClick={() => setCreating(true)} className="mt-4 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">Post a job</button>}
        </div>
      )}

      {(creating || editingJob) && (
        <PostJobModal
          companyPage={companyPage}
          initialJob={editingJob}
          onClose={() => { setCreating(false); setEditingJob(null); }}
          onPosted={onSaved}
        />
      )}
    </section>
  );
}
