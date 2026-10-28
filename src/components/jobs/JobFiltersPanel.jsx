import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { emptyJobFilters, indianJobLocations, jobTypeOptions } from "./jobDefaults.js";

const experienceLevels = ["Internship", "Entry level", "Associate", "Mid-Senior", "Director", "Executive"];
const industries = ["IT Services and IT Consulting", "Software Development", "Financial Services", "Business Consulting and Services", "Technology, Information and Internet", "Professional Services", "Banking", "Staffing and Recruiting", "Education", "Manufacturing", "Pharmaceutical Manufacturing", "Executive Offices"];
const functions = ["Information Technology", "Engineering", "Sales", "Business Development", "Management", "Finance", "Manufacturing", "Marketing", "Design"];
const titles = ["Software Engineer", "Electrical Engineer", "Artificial Intelligence Engineer", "Data Analyst", "Finance Specialist", "Mechanical Engineer", "Full Stack Engineer", "Sales Manager", "Project Manager", "Sales Executive", "Senior Software Engineer", "Data Engineer", "Cloud Engineer"];
const commitments = ["Career growth and learning", "Diversity, equity, and inclusion", "Environmental sustainability", "Social impact", "Work-life balance"];

export default function JobFiltersPanel({ filters, companies, onClose, onApply }) {
  const [draft, setDraft] = useState(() => structuredClone(filters));
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const toggle = (field, value) => setDraft((current) => ({
    ...current,
    [field]: current[field].includes(value)
      ? current[field].filter((item) => item !== value)
      : [...current[field], value],
  }));
  const clear = () => setDraft(emptyJobFilters);

  return <div className="fixed inset-0 z-[65] bg-black/35" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <aside role="dialog" aria-modal="true" aria-labelledby="filters-title" className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white shadow-2xl">
      <header className="flex shrink-0 items-center border-b border-gray-200 px-5 py-4">
        <div className="min-w-0 flex-1"><h2 id="filters-title" className="text-base font-semibold text-ink">All job filters</h2><p className="mt-0.5 text-xs text-muted-ink">Choose the details that matter to you.</p></div>
        <button type="button" onClick={onClose} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button>
      </header>
      <div className="min-h-0 flex-1 divide-y divide-gray-200 overflow-y-auto overscroll-contain px-5">
        <section className="py-4"><h3 className="mb-3 text-sm font-semibold">Sort by</h3><div className="flex gap-6"><Radio label="Most recent" checked={draft.sortBy === "recent"} onChange={() => setDraft((current) => ({ ...current, sortBy: "recent" }))} /><Radio label="Most relevant" checked={draft.sortBy !== "recent"} onChange={() => setDraft((current) => ({ ...current, sortBy: "relevant" }))} /></div></section>
        <section className="py-4"><h3 className="mb-3 text-sm font-semibold">Date posted</h3><div className="grid grid-cols-2 gap-x-4 gap-y-3">{[["any", "Any time"], ["month", "Past month"], ["week", "Past week"], ["24h", "Past 24 hours"]].map(([value, label]) => <Radio key={value} label={label} checked={(draft.datePosted || "any") === value} onChange={() => setDraft((current) => ({ ...current, datePosted: value }))} />)}</div></section>
        <FilterGroup title="Experience level" field="levels" options={experienceLevels} selected={draft.levels} onToggle={toggle} />
        <FilterGroup title="Company" field="companies" options={companies} selected={draft.companies} onToggle={toggle} />
        <FilterGroup title="Job type" field="jobTypes" options={jobTypeOptions} selected={draft.jobTypes} onToggle={toggle} />
        <FilterGroup title="Workplace type" field="workModes" options={["On-site", "Hybrid", "Remote"]} selected={draft.workModes} onToggle={toggle} />
        <FilterGroup title="Location (India)" field="locations" options={indianJobLocations} selected={draft.locations} onToggle={toggle} />
        <FilterGroup title="Industry" field="industries" options={industries} selected={draft.industries} onToggle={toggle} />
        <FilterGroup title="Job function" field="functions" options={functions} selected={draft.functions} onToggle={toggle} />
        <FilterGroup title="Title" field="titles" options={titles} selected={draft.titles} onToggle={toggle} />
        <FilterGroup title="Commitments" field="commitments" options={commitments} selected={draft.commitments} onToggle={toggle} />
        <div className="divide-y divide-gray-100">
          <ToggleRow label="Easy Apply" checked={draft.easyApply} onChange={(checked) => setDraft((current) => ({ ...current, easyApply: checked }))} />
          <ToggleRow label="Has verifications" checked={draft.verified} onChange={(checked) => setDraft((current) => ({ ...current, verified: checked }))} />
          <ToggleRow label="Under 10 applicants" checked={draft.under10} onChange={(checked) => setDraft((current) => ({ ...current, under10: checked }))} />
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-5 py-4">
        <button type="button" onClick={clear} className="text-sm font-medium text-gray-600 hover:text-ink">Reset</button>
        <button type="button" onClick={() => onApply(draft)} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Show matching jobs</button>
      </footer>
    </aside>
  </div>;
}

function FilterGroup({ title, field, options, selected = [], onToggle }) {
  if (!options.length) return null;
  return <section className="py-4"><h3 className="mb-3 text-sm font-semibold">{title}</h3><div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{options.map((option) => <label key={option} className="flex cursor-pointer items-start gap-2 text-xs leading-4 text-gray-700"><input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(field, option)} className="mt-0.5 accent-brand" /><span>{option}</span></label>)}</div></section>;
}

function Radio({ label, checked, onChange }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="radio" checked={checked} onChange={onChange} className="accent-emerald-700" />{label}</label>;
}

function ToggleRow({ label, checked, onChange }) {
  return <label className="flex cursor-pointer items-center justify-between py-3.5 text-sm"><span>{label}</span><button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-700" : "bg-gray-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button></label>;
}
