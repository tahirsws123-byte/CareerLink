import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import api from "../services/api.js";

export default function CandidateJobView() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [saved, setSaved] = useState(false);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: details }, { data: listing }] = await Promise.all([
          api.get(`/jobs/${jobId}/details`),
          api.get("/jobs", { params: { jobId } }),
        ]);
        if (!active) return;
        setJob(details.job);
        setIsOwner(Boolean(details.isOwner));
        setSaved(Boolean(listing.jobs?.[0]?.saved));
        setApplication(listing.jobs?.[0]?.application || null);
      } catch (error) {
        if (!active) return;
        toast.error(error.response?.data?.message || "Unable to load job details");
        navigate("/jobs/manage", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [jobId, navigate]);

  const toggleSaved = async () => {
    try {
      const { data } = await api.post(`/jobs/${jobId}/save`);
      setSaved(data.saved);
      toast.success(data.saved ? "Job saved to your tracker" : "Job removed from saved jobs");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update saved job");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Job link copied");
    } catch {
      toast.error("Unable to copy the job link");
    }
  };

  if (loading) return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] p-8 text-center text-sm text-muted-ink">Loading job…</div>;
  if (!job) return null;

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5">
    <div className="mx-auto max-w-5xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white"><ArrowLeft size={17} />Back</button>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><BriefcaseBusiness size={28} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-700">{job.company}</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{job.title}</h1><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-ink"><span className="inline-flex items-center gap-1"><MapPin size={15} />{job.location}</span><span>·</span><span>{job.workMode}</span><span>·</span><span>{job.type}</span></p><p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-ink"><Clock3 size={13} />Posted {new Date(job.createdAt).toLocaleDateString()}</p></div></div>
            {job.status === "closed" && <div className="mt-5 rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">This job is closed and is not accepting applications.</div>}
            <div className="mt-6 flex flex-wrap gap-2">
              {!isOwner && job.status !== "closed" && <button type="button" onClick={() => application ? navigate("/jobs/tracker") : navigate(`/jobs?jobId=${jobId}&apply=true`)} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">{application ? "Application submitted" : "Apply now"}</button>}
              {isOwner && <Link to={`/jobs/manage/${jobId}`} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Manage job</Link>}
              {!isOwner && <button type="button" onClick={toggleSaved} aria-pressed={saved} className="inline-flex items-center gap-2 rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-sky"><Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}</button>}
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Share2 size={16} />Share</button>
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-bold text-ink">About the job</h2><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{job.description}</div>{job.tags?.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold text-ink">Skills</h3><div className="mt-2 flex flex-wrap gap-2">{job.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-700">{tag}</span>)}</div></div>}</section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold text-ink">About the poster</h2><Link to={`/profile/${job.postedBy?.publicProfileSlug || job.postedBy?._id}`} className="mt-4 flex items-center gap-3"><ProfileAvatar user={job.postedBy} size={46} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{job.postedBy?.name || job.company}</p><p className="truncate text-xs text-muted-ink">{job.postedBy?.headline || "Hiring on CareerLink"}</p></div></Link></section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold text-ink">Job overview</h2><Detail label="Workplace" value={job.workMode} /><Detail label="Employment" value={job.type} /><Detail label="Experience" value={job.level} />{job.salary && <Detail label="Salary" value={job.salary} />}{job.industry && <Detail label="Industry" value={job.industry} />}</section>
          {application && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17} />You have applied</p><p className="mt-1 text-xs text-emerald-700">Current status: {application.status === "reviewing" ? "In progress" : application.status}</p></section>}
        </aside>
      </div>
    </div>
  </div>;
}

function Detail({ label, value }) {
  return <p className="mt-3 flex justify-between gap-3 text-sm"><span className="text-muted-ink">{label}</span><span className="text-right font-medium text-ink">{value}</span></p>;
}
