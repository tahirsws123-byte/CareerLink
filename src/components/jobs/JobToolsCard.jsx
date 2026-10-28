import { Link } from "react-router-dom";
import { BookmarkCheck, BriefcaseBusiness, SlidersHorizontal } from "lucide-react";

export default function JobToolsCard({ onPreferencesClick, onPostJobClick, alertActive = false }) {
  return <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-label="Job tools">
    <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-ink">Your job tools</h2>
    <button type="button" onClick={onPreferencesClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-ink transition hover:bg-gray-50 hover:text-brand">
      <SlidersHorizontal size={18} className="text-gray-700" /><span className="min-w-0 flex-1">Preferences</span>{alertActive && <span className="h-2 w-2 rounded-full bg-emerald-600" title="Job alert active" />}
    </button>
    <Link to="/jobs/tracker" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink transition hover:bg-gray-50 hover:text-brand">
      <BookmarkCheck size={18} className="text-gray-700" />Job tracker
    </Link>
    <Link to="/jobs/applications" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink transition hover:bg-gray-50 hover:text-brand">
      <BriefcaseBusiness size={18} className="text-gray-700" />Manage applicants
    </Link>
    <button type="button" onClick={onPostJobClick} className="mt-2 flex w-full items-center gap-3 border-t border-gray-100 px-3 pt-4 text-left text-sm font-semibold text-brand transition hover:text-brand-hover">
      <BriefcaseBusiness size={18} />Post a free job
    </button>
  </section>;
}
