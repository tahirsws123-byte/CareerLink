import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import api from "../services/api.js";

const applicationStatuses = ["applied", "reviewing", "interview", "offer", "rejected", "withdrawn"];

export default function JobApplicants() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/jobs/applications/employer");
      setApplications(data.applications || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load applicants");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (applicationId, status) => {
    try {
      const { data } = await api.patch(`/jobs/applications/${applicationId}/status`, { status });
      setApplications((items) => items.map((item) => item._id === applicationId ? data.application : item));
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

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-4 py-6"><main className="mx-auto max-w-5xl"><Card className="overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-5"><div><h1 className="text-xl font-semibold text-ink">Manage applicants</h1><p className="mt-1 text-sm text-muted-ink">Review applications for jobs posted from your account.</p></div><Link to="/jobs" className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Back to jobs</Link></div>
    {loading && <p className="p-8 text-center text-sm text-muted-ink">Loading applications…</p>}
    {!loading && error && <div role="alert" className="p-8 text-center text-sm text-red-600">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Try again</button></div>}
    {!loading && !error && applications.length === 0 && <p className="p-10 text-center text-sm text-muted-ink">No applications have been received for your jobs yet.</p>}
    {!loading && !error && applications.map((application) => <article key={application._id} className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold text-ink">{application.fullName}</h2><p className="mt-1 text-sm text-muted-ink">{application.email}{application.phone ? ` · ${application.phone}` : ""}</p><p className="mt-2 text-sm font-medium text-gray-700">{application.job?.title} · {application.job?.company}</p>{application.coverLetter && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-gray-600">{application.coverLetter}</p>}<p className="mt-2 text-xs text-muted-ink">Applied {new Date(application.createdAt).toLocaleDateString()}</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><select aria-label={`Application status for ${application.fullName}`} value={application.status} onChange={(event) => updateStatus(application._id, event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">{applicationStatuses.map((status) => <option key={status} value={status}>{status === "reviewing" ? "In progress" : status}</option>)}</select>{application.resumeRef && <button type="button" onClick={() => downloadResume(application._id)} className="rounded-full border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-sky">{application.resumeName || "Download resume"}</button>}{application.resume && <a href={application.resume} target="_blank" rel="noreferrer" className="rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Resume link</a>}</div></article>)}
  </Card></main></div>;
}
