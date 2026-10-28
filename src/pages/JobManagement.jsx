import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Check, Ellipsis, ExternalLink, MapPin, Search, UsersRound, X, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import api from "../services/api.js";

const tabs = [
  { id: "plan", label: "Hiring plan" },
  { id: "candidates", label: "Candidate search" },
  { id: "applicants", label: "Applicants" },
];
const statusOptions = ["applied", "reviewing", "interview", "offer", "rejected", "withdrawn"];

export default function JobManagement() {
  const { jobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = tabs.some((tab) => tab.id === searchParams.get("tab")) ? searchParams.get("tab") : "plan";
  const [job, setJob] = useState(null);
  const [views, setViews] = useState(0);
  const [applicants, setApplicants] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");
  const [invitingId, setInvitingId] = useState("");
  const [query, setQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [sharing, setSharing] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/jobs/manage/${jobId}`);
      setJob({ ...data.job, applicantCount: data.applicantCount || 0 });
      setViews(data.views || 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const loadTabData = useCallback(async () => {
    if (activeTab === "plan") return;
    try {
      setTabLoading(true);
      if (activeTab === "candidates") {
        const { data } = await api.get(`/jobs/manage/${jobId}/candidates`);
        setCandidates(data.candidates || []);
      } else {
        const { data } = await api.get("/jobs/applications/employer");
        setApplicants((data.applications || []).filter((application) => application.job?._id === jobId));
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || `Unable to load ${activeTab}`);
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);
  useEffect(() => { loadTabData(); }, [loadTabData]);

  const selectTab = (tab) => {
    if (tab === "plan") setSearchParams({});
    else setSearchParams({ tab });
  };

  const changeJobStatus = async () => {
    const status = job.status === "closed" ? "open" : "closed";
    if (status === "closed" && !window.confirm(`Close “${job.title}”? Candidates will no longer be able to apply.`)) return;
    try {
      setUpdatingStatus(status);
      const { data } = await api.patch(`/jobs/manage/${jobId}/status`, { status });
      setJob(data.job);
      setMenuOpen(false);
      toast.success(status === "closed" ? "Job closed" : "Job reopened");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update job status");
    } finally {
      setUpdatingStatus("");
    }
  };

  const copyJobLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/view/${jobId}`);
      toast.success("Job link copied");
      setMenuOpen(false);
    } catch {
      toast.error("Unable to copy the job link");
    }
  };

  const shareJobInPost = async (event) => {
    event.preventDefault();
    try {
      setSharing(true);
      const formData = new FormData();
      const intro = shareText.trim();
      formData.append("text", `${intro ? `${intro}\n\n` : ""}We're hiring: ${job.title} at ${job.company}.\n${window.location.origin}/jobs/view/${jobId}`);
      await api.post("/posts", formData);
      setShareOpen(false);
      setShareText("");
      toast.success("Job shared in a post");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to share this job in a post");
    } finally {
      setSharing(false);
    }
  };

  const inviteCandidate = async (candidate) => {
    try {
      setInvitingId(candidate._id);
      await api.post(`/jobs/manage/${jobId}/invite/${candidate._id}`);
      setCandidates((items) => items.map((item) => item._id === candidate._id ? { ...item, invited: true } : item));
      toast.success(`Invitation sent to ${candidate.name}`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to invite this candidate");
    } finally {
      setInvitingId("");
    }
  };

  const updateApplicantStatus = async (applicationId, status) => {
    try {
      const { data } = await api.patch(`/jobs/applications/${applicationId}/status`, { status });
      setApplicants((items) => items.map((item) => item._id === applicationId ? { ...data.application, applicant: item.applicant, job: item.job } : item));
      toast.success("Applicant status updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update applicant status");
    }
  };

  const downloadResume = async (applicationId) => {
    try {
      const { data } = await api.get(`/jobs/applications/${applicationId}/resume`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to open applicant resume");
    }
  };

  const filteredCandidates = candidates.filter((candidate) => `${candidate.name} ${candidate.headline} ${candidate.location} ${(candidate.skills || []).join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  if (loading) return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] p-8 text-center text-sm text-muted-ink">Loading hiring plan…</div>;
  if (error || !job) return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] p-8 text-center text-sm text-red-600">{error || "Job not found"} <Link to="/jobs/manage" className="ml-2 font-semibold underline">Back to posted jobs</Link></div>;

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef]">
    <div className="sticky top-14 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-3 sm:px-6">
        <Link to="/jobs/manage" className="flex min-w-0 items-center gap-2 py-3 text-sm font-semibold text-ink hover:text-brand"><ArrowLeft size={18} /><span className="truncate">{job.title}</span></Link>
        <nav aria-label="Job management" className="flex min-w-0 gap-1 overflow-x-auto">
          {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => selectTab(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-4 text-sm font-medium ${activeTab === tab.id ? "border-brand text-brand" : "border-transparent text-gray-600 hover:text-ink"}`}>{tab.label}{tab.id === "applicants" ? ` (${applicants.length || job.applicantCount || 0})` : ""}</button>)}
        </nav>
        <span className="hidden w-24 sm:block" aria-hidden="true" />
      </div>
    </div>

    <div className="mx-auto grid max-w-[1480px] grid-cols-1 items-start gap-4 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,.9fr)]">
      <main className="min-w-0">
        {activeTab === "plan" && <div className="space-y-3">
          <button type="button" onClick={() => selectTab("plan")} className="hidden" aria-hidden="true" />
          <PlanCard state="Completed" title="Post job" description="Your job is posted and candidates can discover it." metric={`${views} views`} onClick={() => navigate(`/jobs/view/${jobId}`)} />
          <PlanCard state={job.status === "closed" ? "Paused" : "Active"} title="Find candidates" description={job.status === "closed" ? "Reopen this job to continue finding candidates." : "Review people recommended based on your job requirements."} metric="Candidate search" onClick={() => selectTab("candidates")} />
          <PlanCard state={job.status === "closed" ? "Paused" : "Active"} title="Review applicants" description={applicants.length ? `${applicants.length} people have applied to this role.` : "Applications for this job will appear here."} metric={`${applicants.length || job.applicantCount || 0} total`} onClick={() => selectTab("applicants")} action="Review" />
          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Hiring guidance</p><h2 className="mt-2 text-xl font-semibold text-ink">Make your next step count</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-ink">Compare candidates against the role, keep application statuses current, and close the job when you are no longer accepting applicants.</p><button type="button" onClick={() => selectTab("candidates")} className="mt-4 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Find candidates</button></section>
        </div>}

        {activeTab === "candidates" && <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <header className="border-b border-gray-100 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-brand">Recommended for this job</p><h1 className="mt-1 text-2xl font-bold text-ink">Candidate search</h1><p className="mt-2 text-sm leading-6 text-muted-ink">People are ranked by overlap between their open-to-work preferences, skills, location, and this job’s requirements.</p><div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-300 px-3"><Search size={17} className="text-muted-ink" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recommended candidates" className="w-full py-2.5 text-sm outline-none" /></div></header>
          {tabLoading && <p className="p-8 text-center text-sm text-muted-ink">Finding matching candidates…</p>}
          {!tabLoading && filteredCandidates.length === 0 && <div className="p-10 text-center"><UsersRound className="mx-auto text-brand" size={28} /><h2 className="mt-3 font-semibold text-ink">No matching candidates yet</h2><p className="mt-1 text-sm text-muted-ink">Recommendations appear for candidates with public profiles and open-to-work preferences.</p></div>}
          {!tabLoading && filteredCandidates.map((candidate) => <article key={candidate._id} className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-start sm:p-5">
            <Link to={`/profile/${candidate.publicProfileSlug || candidate._id}`} className="shrink-0"><ProfileAvatar user={candidate} size={54} /></Link>
            <div className="min-w-0 flex-1"><Link to={`/profile/${candidate.publicProfileSlug || candidate._id}`} className="font-semibold text-ink hover:text-brand">{candidate.name}</Link><p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{candidate.headline || candidate.openToWork?.titles?.join(" · ") || "Open to opportunities"}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-ink"><MapPin size={13} />{candidate.location || candidate.openToWork?.locations?.join(", ") || "Location not specified"}</p><div className="mt-2 flex flex-wrap gap-1.5">{candidate.matchSignals?.map((signal) => <span key={signal} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">{signal}</span>)}</div>{candidate.skills?.length > 0 && <p className="mt-2 truncate text-xs text-muted-ink">Skills: {candidate.skills.slice(0, 6).join(" · ")}</p>}</div>
            <div className="flex shrink-0 gap-2 sm:flex-col"><button type="button" disabled={candidate.invited || invitingId === candidate._id || job.status === "closed"} onClick={() => inviteCandidate(candidate)} className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300">{candidate.invited ? "Invited" : invitingId === candidate._id ? "Sending…" : "Invite to apply"}</button><Link to={`/profile/${candidate.publicProfileSlug || candidate._id}`} className="rounded-full border border-brand px-4 py-2 text-center text-xs font-semibold text-brand hover:bg-sky">View profile</Link></div>
          </article>)}
        </section>}

        {activeTab === "applicants" && <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <header className="border-b border-gray-100 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-brand">Hiring pipeline</p><h1 className="mt-1 text-2xl font-bold text-ink">Applicants</h1><p className="mt-2 text-sm text-muted-ink">Review applications and update each candidate’s status.</p></header>
          {tabLoading && <p className="p-8 text-center text-sm text-muted-ink">Loading applicants…</p>}
          {!tabLoading && applicants.length === 0 && <div className="p-10 text-center"><UsersRound className="mx-auto text-brand" size={28} /><h2 className="mt-3 font-semibold text-ink">No applicants yet</h2><p className="mt-1 text-sm text-muted-ink">New applications for {job.title} will show here.</p></div>}
          {!tabLoading && applicants.map((application) => <article key={application._id} className="border-b border-gray-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><ProfileAvatar user={application.applicant || { name: application.fullName }} size={46} /><div className="min-w-0"><h2 className="font-semibold text-ink">{application.fullName}</h2><p className="text-sm text-muted-ink">{application.applicant?.headline || application.email}{application.phone ? ` · ${application.phone}` : ""}</p><p className="mt-1 text-xs text-muted-ink">Applied {new Date(application.createdAt).toLocaleDateString()}</p></div></div>
              <div className="flex flex-wrap items-center gap-2"><select aria-label={`Application status for ${application.fullName}`} value={application.status} onChange={(event) => updateApplicantStatus(application._id, event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">{statusOptions.map((status) => <option key={status} value={status}>{status === "reviewing" ? "In progress" : status}</option>)}</select>{application.resumeRef && <button type="button" onClick={() => downloadResume(application._id)} className="rounded-full border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-sky">{application.resumeName || "Resume"}</button>}{application.resume && <a href={application.resume} target="_blank" rel="noreferrer" className="rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Resume link</a>}</div>
            </div>{application.coverLetter && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">{application.coverLetter}</p>}
          </article>)}
        </section>}
      </main>

      <aside className="space-y-4 lg:sticky lg:top-32">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-slate-500"><BriefcaseBusiness size={26} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{job.company}</p><p className="text-xs text-muted-ink">{job.status === "closed" ? "Closed" : "Open"} · Posted {timeAgo(job.createdAt)}</p></div></div>
          <h2 className="mt-4 text-2xl font-bold text-ink">{job.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-ink"><MapPin size={15} />{job.location} ({job.workMode})</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-ink"><span className={job.status === "closed" ? "font-semibold text-gray-600" : "font-semibold text-amber-700"}>{job.status === "closed" ? "Closed" : "Open"}</span><span>·</span><span>Created {new Date(job.createdAt).toLocaleDateString()}</span></div>
          <div className="mt-5 flex items-center gap-2"><Link to={`/jobs/view/${jobId}`} className="inline-flex items-center gap-1 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">View as candidate <ExternalLink size={14} /></Link><button type="button" onClick={() => setMenuOpen((current) => !current)} aria-label="More job actions" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><Ellipsis size={19} /></button></div>
          {menuOpen && <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><button type="button" onClick={changeJobStatus} disabled={Boolean(updatingStatus)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50">{job.status === "closed" ? <Check size={16} /> : <XCircle size={16} />}{updatingStatus ? "Updating…" : job.status === "closed" ? "Reopen job" : "Close job"}</button><button type="button" onClick={() => { setShareOpen(true); setMenuOpen(false); }} className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">Share in post</button><button type="button" onClick={copyJobLink} className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">Copy link to job</button><Link to={`/jobs/view/${jobId}`} onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm hover:bg-gray-50">View job as candidate</Link><Link to="/jobs/manage" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm hover:bg-gray-50">View all jobs</Link></div>}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4"><Metric value={views} label="Views" /><Metric value={applicants.length || job.applicantCount || 0} label="Applicants" /></div>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="font-semibold text-ink">Job details</h3><p className="mt-2 text-sm text-muted-ink">{job.type} · {job.level}</p>{job.salary && <p className="mt-2 text-sm text-muted-ink">{job.salary}</p>}{job.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{job.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{tag}</span>)}</div>}</section>
      </aside>
    </div>
    {shareOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareOpen(false); }}><form onSubmit={shareJobInPost} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-ink">Share job in a post</h2><p className="mt-1 text-xs text-muted-ink">Publish this opening to your CareerLink feed.</p></div><button type="button" onClick={() => setShareOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={19} /></button></header>
      <div className="p-5"><label htmlFor="job-share-note" className="text-sm font-medium text-ink">Add a note <span className="font-normal text-muted-ink">(optional)</span></label><textarea id="job-share-note" value={shareText} onChange={(event) => setShareText(event.target.value)} maxLength={1000} placeholder="Tell your network what makes this opportunity special…" className="mt-2 min-h-28 w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand" /><div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3"><p className="text-sm font-semibold text-ink">{job.title}</p><p className="mt-1 text-xs text-muted-ink">{job.company} · {job.location}</p><p className="mt-2 break-all text-xs text-brand">{window.location.origin}/jobs/view/{jobId}</p></div></div>
      <footer className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4"><button type="button" onClick={() => setShareOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="submit" disabled={sharing} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{sharing ? "Sharing…" : "Post"}</button></footer>
    </form></div>}
  </div>;
}

function PlanCard({ state, title, description, metric, onClick, action }) {
  return <button type="button" onClick={onClick} className="group flex w-full items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md sm:p-6">
    <div className="min-w-0"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-gray-700">{state}</span><h2 className="mt-3 text-xl font-semibold text-ink group-hover:text-brand">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-ink">{description}</p>{action && <span className="mt-4 inline-flex rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand">{action}</span>}</div>
    <span className="shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-muted-ink">{metric}</span>
  </button>;
}

function Metric({ value, label }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2 text-center"><p className="text-xl font-bold text-ink">{value}</p><p className="text-xs text-muted-ink">{label}</p></div>;
}

function timeAgo(value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return !Number.isFinite(days) || days < 1 ? "today" : `${days}d ago`;
}
