import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileCard from "../components/feed/ProfileCard.jsx";
import api from "../services/api.js";

const tabs = ["Saved", "In Progress", "Applied", "Interview", "Archived"];
const statusOptions = [
  ["applied", "Applied"],
  ["reviewing", "In progress"],
  ["interview", "Interview"],
  ["offer", "Offer"],
  ["rejected", "Archived"],
  ["withdrawn", "Withdrawn"],
];

export default function JobTracker() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState("Saved");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTracker = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [jobsResponse, applicationsResponse] = await Promise.all([
        api.get("/jobs"),
        api.get("/jobs/applications/mine"),
      ]);
      setJobs(jobsResponse.data.jobs || []);
      setApplications(applicationsResponse.data.applications || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your job tracker");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTracker(); }, [loadTracker]);

  const visibleItems = useMemo(() => {
    if (activeTab === "Saved") return jobs.filter((job) => job.saved).map((job) => ({ ...job, trackerKind: "saved" }));
    const matching = applications.filter((application) => {
      if (activeTab === "Applied") return application.status === "applied";
      if (activeTab === "In Progress") return ["reviewing", "offer"].includes(application.status);
      if (activeTab === "Interview") return application.status === "interview";
      return ["rejected", "withdrawn"].includes(application.status);
    }).map((application) => ({ ...application.job, application, trackerKind: "application" }));
    return matching.filter((job) => job?._id);
  }, [activeTab, applications, jobs]);
  const sortedItems = useMemo(() => [...visibleItems].sort((a, b) => {
    const dateA = new Date(a.application?.createdAt || a.postedAt || 0).getTime();
    const dateB = new Date(b.application?.createdAt || b.postedAt || 0).getTime();
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
  }), [sortBy, visibleItems]);

  const updateStatus = async (applicationId, status) => {
    try {
      const { data } = await api.patch(`/jobs/applications/${applicationId}/status`, { status });
      setApplications((previous) => previous.map((application) => application._id === applicationId ? data.application : application));
      toast.success("Tracker status updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update tracker status");
    }
  };

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-4 py-6">
    <div className="mx-auto grid max-w-[1128px] grid-cols-1 gap-6 sm:grid-cols-12">
      <aside className="space-y-4 sm:col-span-4 lg:col-span-3"><ProfileCard variant="jobs" /><Card className="p-4"><p className="text-sm font-semibold">Keep your search moving</p><p className="mt-1 text-xs leading-5 text-muted-ink">Save roles from the jobs page and update each application as you progress.</p><Link to="/jobs" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><Search size={15} />Find jobs</Link></Card></aside>
      <main className="min-w-0 sm:col-span-8 lg:col-span-9">
        <Card className="min-h-[620px] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
            <Link to="/jobs" aria-label="Back to jobs" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><ArrowLeft size={20} /></Link>
            <div><h1 className="text-xl font-semibold text-ink">Job tracker</h1><p className="mt-0.5 text-sm text-muted-ink">Your saved jobs and application progress.</p></div>
          </div>
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Job tracker categories" className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"}`}>{tab}<span className="ml-1 opacity-80">· {countForTab(tab, jobs, applications)}</span></button>)}
            </nav>
            <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">Sort by<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-ink"><option value="recent">Date added</option><option value="oldest">Oldest first</option></select></label>
          </div>
          {loading && <div className="p-10 text-center text-sm text-muted-ink">Loading your tracker…</div>}
          {!loading && error && <div role="alert" className="p-10 text-center text-sm text-red-600">{error}<button type="button" onClick={loadTracker} className="ml-2 font-semibold underline">Try again</button></div>}
          {!loading && !error && sortedItems.length === 0 && <div className="grid min-h-[390px] place-items-center px-5 py-12 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><BriefcaseBusiness size={28} /></div><h2 className="mt-4 text-xl font-semibold text-ink">{activeTab === "Saved" ? "No saved jobs yet" : "No jobs here yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-ink">{activeTab === "Saved" ? "Save jobs that interest you and they’ll appear here." : "Applications that match this stage will appear here so you can stay organized."}</p><Link to="/jobs" className="mt-5 inline-flex rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">Find more jobs</Link></div></div>}
          {!loading && !error && sortedItems.length > 0 && <div className="divide-y divide-gray-100">
            {sortedItems.map((job) => <article key={`${activeTab}-${job._id}`} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky text-brand"><BriefcaseBusiness size={22} /></div><div className="min-w-0"><h2 className="font-semibold text-ink">{job.title}</h2><p className="mt-0.5 text-sm text-gray-700">{job.company}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-ink"><span className="inline-flex items-center gap-1"><MapPin size={13} />{job.location}</span>{job.application?.createdAt && <span className="inline-flex items-center gap-1"><CalendarDays size={13} />Applied {new Date(job.application.createdAt).toLocaleDateString()}</span>}</div></div></div>
              {job.trackerKind === "application" && <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-gray-600">Status<select value={job.application.status} onChange={(event) => updateStatus(job.application._id, event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
              {job.trackerKind === "saved" && <Link to="/jobs" className="self-start rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">View job</Link>}
            </article>)}
          </div>}
          <div className="border-t border-gray-100 px-5 py-4 text-xs text-muted-ink">Not seeing some jobs? Applications that you apply to appear here automatically.</div>
        </Card>
      </main>
    </div>
  </div>;
}

function countForTab(tab, jobs, applications) {
  if (tab === "Saved") return jobs.filter((job) => job.saved).length;
  if (tab === "Applied") return applications.filter((item) => item.status === "applied").length;
  if (tab === "In Progress") return applications.filter((item) => ["reviewing", "offer"].includes(item.status)).length;
  if (tab === "Interview") return applications.filter((item) => item.status === "interview").length;
  return applications.filter((item) => ["rejected", "withdrawn"].includes(item.status)).length;
}
