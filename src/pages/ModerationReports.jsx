import { useEffect, useState } from "react";
import { Check, RotateCcw, ShieldAlert, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";

const reportTypes = [
  ["all", "All types"],
  ["post", "Posts"],
  ["job", "Jobs"],
  ["event", "Events"],
  ["eventComment", "Event comments"],
];
const reportStatuses = [
  ["open", "Open"],
  ["reviewed", "Reviewed"],
  ["dismissed", "Dismissed"],
  ["all", "All statuses"],
];
const typeLabels = Object.fromEntries(reportTypes.slice(1));

const getTargetText = (report) => {
  if (report.reportType === "post") return report.post?.text || "This post is no longer available.";
  if (report.reportType === "job") {
    return report.job ? `${report.job.title} · ${report.job.company}` : "This job is no longer available.";
  }
  if (report.reportType === "eventComment") return report.targetContent || "This event comment is no longer available.";
  return report.event?.title || "This event is no longer available.";
};

export default function ModerationReports() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/moderation/reports", { params: { status, type } });
      setReports(data.reports || []);
      setTruncated(Boolean(data.truncated));
      setAccessDenied(false);
    } catch (error) {
      if (error.response?.status === 403) setAccessDenied(true);
      else toast.error(error.response?.data?.message || "Unable to load moderation reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // Filters are the only inputs that should reload this list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  const updateStatus = async (report, nextStatus) => {
    const key = `${report.reportType}:${report._id}`;
    setSavingId(key);
    try {
      await api.patch(`/moderation/reports/${report.reportType}/${report._id}`, { status: nextStatus });
      toast.success(nextStatus === "reviewed" ? "Report marked reviewed" : nextStatus === "dismissed" ? "Report dismissed" : "Report reopened");
      await loadReports();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update this report");
    } finally {
      setSavingId("");
    }
  };

  if (accessDenied) {
    return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-xl font-semibold text-ink">Moderator access required</h1><p className="mt-2 text-sm leading-6 text-muted-ink">This account is not assigned to review CareerLink reports.</p></div></main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><ShieldAlert size={21} /></span>
          <div><h1 className="text-xl font-semibold text-ink sm:text-2xl">Moderation reports</h1><p className="mt-1 text-sm leading-5 text-muted-ink">Review reports about posts, jobs, events, and event comments.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto">
          <label className="sr-only" htmlFor="moderation-type">Report type</label>
          <select id="moderation-type" value={type} onChange={(event) => setType(event.target.value)} className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            {reportTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="sr-only" htmlFor="moderation-status">Report status</label>
          <select id="moderation-status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            {reportStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </header>

      {truncated && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Showing the most recent reports for this filter. Narrow the type or status to see earlier reports.</p>}
      {loading ? <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted-ink">Loading reports…</p>
        : reports.length === 0 ? <div className="rounded-xl border border-line bg-white p-8 text-center"><Check size={24} className="mx-auto text-emerald-700" /><h2 className="mt-3 font-semibold text-ink">No reports in this view</h2><p className="mt-1 text-sm text-muted-ink">Try another type or status filter.</p></div>
          : <div className="space-y-3">{reports.map((report) => {
            const key = `${report.reportType}:${report._id}`;
            return <article key={key} className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900">{typeLabels[report.reportType] || report.reportType}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === "open" ? "bg-amber-50 text-amber-900" : report.status === "reviewed" ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-700"}`}>{report.status}</span>
                <time className="ml-auto text-xs text-muted-ink" dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time>
              </div>
              <h2 className="mt-3 break-words font-semibold text-ink">{getTargetText(report)}</h2>
              {report.reportType === "eventComment" && report.event?.title && <p className="mt-1 text-xs text-muted-ink">On event: {report.event.title}</p>}
              <p className="mt-2 text-sm text-muted-ink">Reason: <span className="font-medium capitalize text-ink">{report.reason}</span></p>
              {report.details && <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{report.details}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <span className="min-w-0 text-xs text-muted-ink">Reported by {report.reporter?.name || "CareerLink member"}{report.reviewedBy?.name ? ` · last reviewed by ${report.reviewedBy.name}` : ""}</span>
                <div className="flex flex-wrap gap-2">
                  {report.status !== "reviewed" && <button type="button" disabled={savingId === key} onClick={() => updateStatus(report, "reviewed")} className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50"><Check size={14} />Mark reviewed</button>}
                  {report.status !== "dismissed" && <button type="button" disabled={savingId === key} onClick={() => updateStatus(report, "dismissed")} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"><X size={14} />Dismiss</button>}
                  {report.status !== "open" && <button type="button" disabled={savingId === key} onClick={() => updateStatus(report, "open")} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"><RotateCcw size={14} />Reopen</button>}
                </div>
              </div>
            </article>;
          })}</div>}
    </main>
  );
}
