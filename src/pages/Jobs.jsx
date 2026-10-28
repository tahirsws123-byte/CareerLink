import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, Bookmark, CheckCircle2, Flag, MapPin, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import useAuth from "../hooks/useAuth.js";
import ProfileCard from "../components/feed/ProfileCard.jsx";
import JobToolsCard from "../components/jobs/JobToolsCard.jsx";
import JobPreferencesModal from "../components/jobs/JobPreferencesModal.jsx";
import JobFiltersPanel from "../components/jobs/JobFiltersPanel.jsx";
import { defaultJobPreferences, emptyJobFilters, indianJobLocations, jobTypeOptions } from "../components/jobs/jobDefaults.js";
import PostJobModal from "../components/jobs/PostJobModal.jsx";
import ShareJobModal from "../components/jobs/ShareJobModal.jsx";
import { getMyProfile, updateProfile } from "../services/userServices.js";
import useTranslation from "../hooks/useTranslation";

const statusLabels = { applied: "Applied", reviewing: "In progress", interview: "Interview", offer: "Offer", rejected: "Archived", withdrawn: "Withdrawn" };
const preferenceKey = (userId) => `careerlink-job-preferences:${userId}`;
const searchInputClass = "w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";

export default function Jobs() {
  const { user } = useAuth();
  const t = useTranslation();
  const [searchParams] = useSearchParams();
  const sharedJobId = searchParams.get("jobId") || "";
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [filters, setFilters] = useState(emptyJobFilters);
  const [preferences, setPreferences] = useState(defaultJobPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyJob, setApplyJob] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [jobToShare, setJobToShare] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", resume: "", resumeRef: "", coverLetter: "" });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [reportJob, setReportJob] = useState(null);
  const [reportReason, setReportReason] = useState("misleading");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    getMyProfile().then((profile) => {
      setResumes(profile.resumes || []);
      if (profile.openToWork) {
        setPreferences((current) => ({
          ...current,
          openToWork: {
            ...current.openToWork,
            ...profile.openToWork,
            locations: (profile.openToWork.locations || []).join(", "),
          },
        }));
      }
    }).catch((requestError) => {
      toast.error(requestError.response?.data?.message || "Unable to load saved resumes");
    });
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        q: query,
        jobId: sharedJobId,
        type: selectedType,
        location: selectedLocation,
        datePosted: filters.datePosted,
        levels: filters.levels.join(","),
        companies: filters.companies.join(","),
        jobTypes: filters.jobTypes.join(","),
        workModes: filters.workModes.join(","),
        locations: filters.locations.join(","),
        industries: filters.industries.join(","),
        functions: filters.functions.join(","),
        titles: filters.titles.join(","),
        commitments: filters.commitments.join(","),
        easyApply: filters.easyApply,
        verified: filters.verified,
        under10: filters.under10,
      };
      const { data } = await api.get("/jobs", { params });
      setJobs(data.jobs || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }, [query, selectedType, selectedLocation, filters, sharedJobId]);

  useEffect(() => {
    const timer = setTimeout(loadJobs, 250);
    return () => clearTimeout(timer);
  }, [loadJobs]);

  useEffect(() => {
    if (searchParams.get("apply") !== "true" || !sharedJobId || loading) return;
    const job = jobs.find((item) => item._id === sharedJobId);
    if (job) setApplyJob(job);
  }, [jobs, loading, searchParams, sharedJobId]);

  useEffect(() => {
    if (searchParams.get("post") === "true") setPostJobOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!user?._id) return;
    try {
      const saved = localStorage.getItem(preferenceKey(user._id));
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({
          ...defaultJobPreferences,
          ...parsed,
          openToWork: { ...defaultJobPreferences.openToWork, ...parsed.openToWork },
          jobAlerts: { ...defaultJobPreferences.jobAlerts, ...parsed.jobAlerts },
        });
      }
    } catch {
      toast.error("Unable to load your saved job preferences");
    }
  }, [user?._id]);

  useEffect(() => {
    let ignore = false;
    api.get("/jobs/alerts/mine").then(({ data }) => {
      if (ignore || !data.alert) return;
      const alert = data.alert;
      setPreferences((current) => ({
        ...current,
        jobAlerts: {
          enabled: alert.active,
          title: alert.title,
          location: alert.location || "",
          workMode: alert.workMode || "",
          type: alert.type || "",
          level: alert.level || "",
          frequency: alert.frequency || "Daily",
        },
      }));
    }).catch((requestError) => {
      toast.error(requestError.response?.data?.message || "Unable to load your job alert");
    });
    return () => { ignore = true; };
  }, []);

  const companies = useMemo(() => [...new Set(jobs.map((job) => job.company).filter(Boolean))].sort(), [jobs]);
  const orderedJobs = useMemo(() => [...jobs].sort((a, b) => {
    const postedA = new Date(a.postedAt || 0).getTime();
    const postedB = new Date(b.postedAt || 0).getTime();
    if (filters.sortBy === "recent" || !query.trim()) return postedB - postedA;
    const term = query.trim().toLocaleLowerCase();
    const relevance = (job) => [
      [job.title, 4],
      [job.company, 3],
      [(job.tags || []).join(" "), 2],
      [job.description, 1],
    ].reduce((score, [value, weight]) => score + (value?.toLocaleLowerCase().includes(term) ? weight : 0), 0);
    return relevance(b) - relevance(a) || postedB - postedA;
  }), [filters.sortBy, jobs, query]);
  const savedCount = jobs.filter((job) => job.saved).length;
  const appliedCount = jobs.filter((job) => job.application).length;
  const activeFilterCount = [
    filters.levels.length,
    filters.companies.length,
    filters.jobTypes.length,
    filters.workModes.length,
    filters.locations.length,
    filters.industries.length,
    filters.functions.length,
    filters.titles.length,
    filters.commitments.length,
    filters.datePosted !== "any" ? 1 : 0,
    filters.easyApply ? 1 : 0,
    filters.verified ? 1 : 0,
    filters.under10 ? 1 : 0,
  ].reduce((total, count) => total + count, 0);

  const savePreferences = async (nextPreferences, section) => {
    try {
      if (section === "open") {
        const openToWork = nextPreferences.openToWork;
        await updateProfile({
          openToWork: {
            ...openToWork,
            enabled: true,
            locations: (Array.isArray(openToWork.locations) ? openToWork.locations : openToWork.locations.split(","))
              .map((location) => location.trim()).filter(Boolean),
          },
        });
      }
      if (nextPreferences.jobAlerts.enabled) {
        const { data } = await api.put("/jobs/alerts/mine", nextPreferences.jobAlerts);
        nextPreferences = {
          ...nextPreferences,
          jobAlerts: {
            enabled: data.alert.active,
            title: data.alert.title,
            location: data.alert.location || "",
            workMode: data.alert.workMode || "",
            type: data.alert.type || "",
            level: data.alert.level || "",
            frequency: data.alert.frequency || "Daily",
          },
        };
      } else {
        await api.delete("/jobs/alerts/mine");
      }
      localStorage.setItem(preferenceKey(user._id), JSON.stringify(nextPreferences));
      setPreferences(nextPreferences);
      toast.success("Job preferences saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save job preferences");
    }
  };

  const updateQuickFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value ? [value] : [] }));
  };

  const toggleSaved = async (job) => {
    try {
      const { data } = await api.post(`/jobs/${job._id}/save`);
      setJobs((previous) => previous.map((item) => item._id === job._id ? { ...item, saved: data.saved } : item));
      toast.success(data.saved ? "Job saved to your tracker" : "Job removed from saved jobs");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update saved job");
    }
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (submittingApplication) return;
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const resume = form.resume.trim();
    if (!fullName || !email) {
      toast.error("Full name and email are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    const savedResumeRef = form.resumeRef === "external" ? "" : form.resumeRef;
    if (!savedResumeRef && !resume) {
      toast.error("Choose a saved resume or provide a resume link");
      return;
    }
    try {
      setSubmittingApplication(true);
      const { data } = await api.post(`/jobs/${applyJob._id}/apply`, {
        ...form,
        fullName,
        email,
        phone,
        resume,
        resumeRef: savedResumeRef || null,
        coverLetter: form.coverLetter.trim(),
      });
      setJobs((previous) => previous.map((job) => job._id === applyJob._id ? { ...job, application: data.application } : job));
      setApplyJob(null);
      toast.success("Application submitted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to submit application");
    } finally {
      setSubmittingApplication(false);
    }
  };

  const updateStatus = async (job, status) => {
    try {
      const { data } = await api.patch(`/jobs/applications/${job.application._id}/status`, { status });
      setJobs((previous) => previous.map((item) => item._id === job._id ? { ...item, application: data.application } : item));
      toast.success("Application status updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update application");
    }
  };

  const submitJobReport = async (event) => {
    event.preventDefault();
    try {
      setReporting(true);
      await api.post(`/jobs/${reportJob._id}/report`, { reason: reportReason, details: reportDetails });
      setReportJob(null);
      setReportDetails("");
      toast.success("Job report submitted for review");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to report this job");
    } finally {
      setReporting(false);
    }
  };

  const changeAdvancedFilters = (nextFilters) => {
    setFilters({ ...emptyJobFilters, ...nextFilters });
    setFiltersOpen(false);
  };

  return <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-4 py-6">
    <div className="mx-auto grid max-w-[1128px] grid-cols-1 gap-6 sm:grid-cols-12">
      <aside className="space-y-4 sm:col-span-4 lg:col-span-3">
        <ProfileCard variant="jobs" />
        <JobToolsCard onPreferencesClick={() => setPreferencesOpen(true)} onPostJobClick={() => setPostJobOpen(true)} alertActive={preferences.jobAlerts.enabled} />
      </aside>

      <main className="min-w-0 space-y-4 sm:col-span-8 lg:col-span-9">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-medium uppercase tracking-[0.12em] text-brand">{t("CareerLink jobs")}</p><h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t("Find the right role for your next move")}</h1></div>
            <div className="flex flex-wrap gap-2"><StatCard label="Saved" value={savedCount} /><StatCard label="Applied" value={appliedCount} /><StatCard label="Tracker" value={appliedCount} /></div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.7fr)_minmax(160px,0.75fr)]">
            <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, companies, skills" className={searchInputClass} /></label>
            <FilterSelect label="Job type" value={selectedType} options={[["All", "All job types"], ...jobTypeOptions.map((value) => [value, value])]} onChange={setSelectedType} />
            <FilterSelect label="Location" value={selectedLocation} options={[["All", "All locations"], ...indianJobLocations.map((value) => [value, value])]} onChange={setSelectedLocation} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <FilterSelect label="Date posted" value={filters.datePosted} options={[["any", "Any time"], ["24h", "Past 24 hours"], ["week", "Past week"], ["month", "Past month"]]} onChange={(value) => setFilters((current) => ({ ...current, datePosted: value }))} />
            <FilterSelect label="Experience level" value={filters.levels[0] || ""} options={[["", "Any experience"], ...["Internship", "Entry level", "Associate", "Mid-Senior", "Director", "Executive"].map((value) => [value, value])]} onChange={(value) => updateQuickFilter("levels", value)} />
            <FilterSelect label="Company" value={filters.companies[0] || ""} options={[["", "Any company"], ...companies.map((value) => [value, value])]} onChange={(value) => updateQuickFilter("companies", value)} />
            <button type="button" aria-pressed={filters.easyApply} onClick={() => setFilters((current) => ({ ...current, easyApply: !current.easyApply }))} className={`rounded-full border px-3.5 py-2 text-sm transition ${filters.easyApply ? "border-brand bg-sky font-semibold text-brand" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"}`}>Easy Apply</button>
            <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3.5 py-2 text-sm text-gray-700 transition hover:border-gray-500"><SlidersHorizontal size={15} />All filters{activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{activeFilterCount}</span>}</button>
            {activeFilterCount > 0 && <button type="button" onClick={() => setFilters(emptyJobFilters)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-brand"><X size={14} />Clear filters</button>}
          </div>
        </section>

        <div className="flex items-center justify-between px-1 text-sm text-muted-ink"><span>{loading ? t("Finding matching jobs…") : `${jobs.length}${t(jobs.length === 1 ? " job found" : " jobs found")}`}</span>{preferences.jobAlerts.enabled && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">{t("Job alert on")}</span>}</div>
        {loading && <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted-ink">{t("Loading jobs…")}</div>}
        {!loading && error && <div role="alert" className="rounded-2xl bg-white p-8 text-center text-sm text-red-600">{error}<button type="button" onClick={loadJobs} className="ml-2 font-semibold underline">{t("Try again")}</button></div>}
        {!loading && !error && jobs.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky text-brand"><Search size={21} /></div><h2 className="mt-3 font-semibold text-ink">{t("No jobs match your current filters")}</h2><p className="mt-1 text-sm text-muted-ink">{t("Try broadening your search or resetting the filters.")}</p><button type="button" onClick={() => { setQuery(""); setSelectedType("All"); setSelectedLocation("All"); setFilters(emptyJobFilters); }} className="mt-4 text-sm font-semibold text-brand hover:underline">{t("Clear all filters")}</button></div>}

        <div className="space-y-4">
          {!loading && !error && orderedJobs.map((job) => {
            const application = job.application;
            return <article key={job._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EEF3F8] text-brand"><BriefcaseBusiness size={23} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-ink">{job.title}</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{job.level}</span></div><p className="mt-1 text-sm font-medium text-gray-700">{job.company}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-ink"><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{job.location}</span><span>{job.type}</span>{job.workMode && <span>{job.workMode}</span>}{job.salary && <span>{job.salary}</span>}<span>{job.posted}</span></div></div></div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => setJobToShare(job)} aria-label={`Share ${job.title} on CareerLink`} title="Share on CareerLink" className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 text-gray-600 hover:border-brand hover:text-brand"><Share2 size={16} /></button>
                    <button type="button" onClick={() => toggleSaved(job)} aria-pressed={Boolean(job.saved)} className={`inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium ${job.saved ? "border-brand bg-brand text-white" : "border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"}`}><Bookmark size={16} className={job.saved ? "fill-current" : ""} />{t(job.saved ? "Saved" : "Save")}</button>
                  {application ? <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700"><CheckCircle2 size={16} />{t(statusLabels[application.status] || "Applied")}</span> : <button type="button" onClick={() => { setApplyJob(job); setForm({ fullName: user?.name || "", email: user?.email || "", phone: "", resume: "", resumeRef: "", coverLetter: "" }); }} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">{t("Apply")}</button>}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-700">{job.description}</p>
              {(job.tags || []).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{job.tags.map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{tag}</span>)}</div>}
              <div className="mt-4 flex flex-wrap items-center gap-2"><StatusPill status={application?.status} />{application && application.status === "applied" && <button type="button" onClick={() => updateStatus(job, "withdrawn")} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-400">Withdraw</button>}</div>
              <button type="button" onClick={() => { setReportJob(job); setReportReason("misleading"); setReportDetails(""); }} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-ink hover:text-red-600"><Flag size={13} />Report job</button>
            </article>;
          })}
        </div>
      </main>
    </div>

    {applyJob && (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingApplication) setApplyJob(null); }}>
        <form onSubmit={submitApplication} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div><h2 className="text-xl font-semibold text-ink">Apply to {applyJob.title}</h2><p className="text-sm text-muted-ink">{applyJob.company}</p></div>
            <button type="button" disabled={submittingApplication} onClick={() => setApplyJob(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button>
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-ink">Full name *<input required minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-sm font-medium text-ink">Email *<input required type="email" maxLength={180} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-sm font-medium text-ink">Phone (optional)<input maxLength={40} autoComplete="tel" placeholder="Phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-sm font-medium text-ink">Resume *<select required value={form.resumeRef || ""} onChange={(event) => setForm({ ...form, resumeRef: event.target.value, resume: event.target.value === "external" ? "" : form.resume })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"><option value="">Choose a resume</option>{resumes.map((resume) => <option key={resume._id} value={resume._id}>{resume.name}</option>)}<option value="external">Use a resume link</option></select></label>
            {form.resumeRef === "external" && <label className="text-sm font-medium text-ink">Resume link *<input required type="url" maxLength={500} placeholder="https://…" value={form.resume} onChange={(event) => setForm({ ...form, resume: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>}
            <label className="text-sm font-medium text-ink">Cover letter (optional)<textarea placeholder="Tell the employer why you are a good fit" rows={5} maxLength={5000} value={form.coverLetter} onChange={(event) => setForm({ ...form, coverLetter: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
            <button type="submit" disabled={submittingApplication} className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{submittingApplication ? "Submitting…" : "Submit application"}</button>
          </div>
        </form>
      </div>
    )}
    {preferencesOpen && <JobPreferencesModal preferences={preferences} onClose={() => setPreferencesOpen(false)} onSave={savePreferences} />}
    {postJobOpen && <PostJobModal onClose={() => setPostJobOpen(false)} onPosted={() => loadJobs()} />}
    {filtersOpen && <JobFiltersPanel filters={filters} companies={companies} onClose={() => setFiltersOpen(false)} onApply={changeAdvancedFilters} />}
    {jobToShare && <ShareJobModal job={jobToShare} onClose={() => setJobToShare(null)} />}
    {reportJob && <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !reporting) setReportJob(null); }}><form onSubmit={submitJobReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-semibold text-ink">Report job</h2><p className="mt-1 text-sm text-muted-ink">{reportJob.title} · {reportJob.company}</p><label className="mt-4 block text-sm font-medium">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"><option value="misleading">Misleading or inaccurate</option><option value="scam">Potential scam</option><option value="discrimination">Discriminatory content</option><option value="expired">Expired or filled</option><option value="other">Other</option></select></label><label className="mt-4 block text-sm font-medium">Details (optional)<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={reporting} onClick={() => setReportJob(null)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={reporting} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{reporting ? "Sending…" : "Send report"}</button></div></form></div>}
  </div>;
}

function FilterSelect({ label, value, options, onChange }) {
  return <label className="relative block min-w-0"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 appearance-none rounded-full border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 hover:border-gray-500"><option disabled value="">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function StatusPill({ status }) {
  if (!status) return <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">Open</span>;
  return <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{statusLabels[status] || status}</span>;
}

function StatCard({ label, value }) {
  return <div className="rounded-xl bg-sky px-3 py-2 text-brand"><div className="text-[11px] uppercase tracking-wide">{label}</div><div className="mt-0.5 text-lg font-bold">{value}</div></div>;
}
