import { useState } from "react";
import { ArrowLeft, ArrowRight, BellRing, BriefcaseBusiness, Check, ChevronLeft, X } from "lucide-react";

const titleOptions = ["Software Engineer", "Frontend Developer", "Product Designer", "Data Analyst"];
const locationOptions = ["On-site", "Hybrid", "Remote"];
const employmentOptions = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];
const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

export default function JobPreferencesModal({ preferences, onClose, onSave }) {
  const [page, setPage] = useState("home");
  const [draft, setDraft] = useState(() => structuredClone(preferences));
  const openToWork = draft.openToWork;
  const jobAlerts = draft.jobAlerts;

  const updateOpen = (field, value) => setDraft((current) => ({
    ...current,
    openToWork: { ...current.openToWork, [field]: value },
  }));
  const toggleValue = (field, value) => updateOpen(
    field,
    openToWork[field].includes(value)
      ? openToWork[field].filter((item) => item !== value)
      : [...openToWork[field], value],
  );
  const save = (section) => {
    onSave(draft, section);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3 sm:p-6" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="job-preferences-title" className="flex max-h-[min(90dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-5 py-4">
          {page !== "home" && <button type="button" onClick={() => setPage("home")} aria-label="Back to preferences" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><ChevronLeft size={20} /></button>}
          <h2 id="job-preferences-title" className="min-w-0 flex-1 text-lg font-semibold text-ink">{page === "home" ? "Preferences" : page === "open" ? "Edit job preferences" : "Job alerts"}</h2>
          <button type="button" onClick={onClose} aria-label="Close preferences" className="grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100"><X size={21} /></button>
        </header>

        {page === "home" && <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <h3 className="mb-3 text-xl font-semibold text-ink">My interests</h3>
          <button type="button" onClick={() => setPage("open")} className="flex w-full items-center gap-4 border-b border-gray-200 py-5 text-left hover:bg-gray-50">
            <BriefcaseBusiness className="shrink-0 text-emerald-700" size={22} />
            <span className="min-w-0 flex-1"><span className="block font-medium">Open to work</span><span className="mt-1 block text-sm text-muted-ink">Job preferences visible to {openToWork.visibility === "everyone" ? "everyone" : openToWork.visibility === "recruiters" ? "recruiters" : "only you"}</span></span>
            <ArrowRight className="shrink-0 text-gray-500" size={20} />
          </button>
          <button type="button" onClick={() => setPage("alerts")} className="flex w-full items-center gap-4 border-b border-gray-200 py-5 text-left hover:bg-gray-50">
            <BellRing className="shrink-0 text-emerald-700" size={22} />
            <span className="min-w-0 flex-1"><span className="block font-medium">Job alerts</span><span className="mt-1 block text-sm text-muted-ink">{jobAlerts.enabled ? `${jobAlerts.title || "Job alert"} · ${jobAlerts.frequency}` : "Create an alert for roles you want"}</span></span>
            <ArrowRight className="shrink-0 text-gray-500" size={20} />
          </button>
          <div className="mt-5 rounded-xl bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">💡</span>
              <span className="min-w-0 flex-1"><span className="block font-medium">Top job picks for you</span><span className="mt-1 block text-sm leading-5 text-muted-ink">Get recommended jobs based on your profile and activity.</span></span>
              <Switch checked={draft.topPicks} label="Top job picks" onChange={(checked) => setDraft((current) => ({ ...current, topPicks: checked }))} />
            </div>
          </div>
        </div>}

        {page === "open" && <form className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7" onSubmit={(event) => { event.preventDefault(); save("open"); }}>
          <p className="mb-5 text-sm text-muted-ink">Tell us what you’re looking for. Required fields are marked with an asterisk.</p>
          <FieldLabel label="Job titles *"><div className="mb-2 flex flex-wrap gap-2">{openToWork.titles.map((title) => <span key={title} className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">{title}<button type="button" aria-label={`Remove ${title}`} onClick={() => toggleValue("titles", title)}>×</button></span>)}</div><select className={inputClass} value="" onChange={(event) => event.target.value && !openToWork.titles.includes(event.target.value) && toggleValue("titles", event.target.value)}><option value="">Add a job title</option>{titleOptions.map((title) => <option key={title} value={title}>{title}</option>)}</select></FieldLabel>
          <FieldLabel label="Location types *"><ChoiceGroup values={locationOptions} selected={openToWork.locationTypes} onToggle={(value) => toggleValue("locationTypes", value)} /></FieldLabel>
          <FieldLabel label="Locations *"><input className={inputClass} value={openToWork.locations} onChange={(event) => updateOpen("locations", event.target.value)} placeholder="Add city, region or country" required /></FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Notice period"><select className={inputClass} value={openToWork.noticePeriod} onChange={(event) => updateOpen("noticePeriod", event.target.value)}><option>Immediately available</option><option>2 weeks</option><option>1 month</option><option>2 months</option></select></FieldLabel>
            <FieldLabel label="Expected annual salary"><input className={inputClass} value={openToWork.salary} onChange={(event) => updateOpen("salary", event.target.value)} placeholder="e.g. $80,000" /></FieldLabel>
          </div>
          <FieldLabel label="Start date"><div className="grid gap-2 sm:grid-cols-2"><RadioChoice checked={openToWork.startDate === "immediately"} label="Immediately, actively applying" onChange={() => updateOpen("startDate", "immediately")} /><RadioChoice checked={openToWork.startDate === "flexible"} label="Flexible, casually looking" onChange={() => updateOpen("startDate", "flexible")} /></div></FieldLabel>
          <FieldLabel label="Employment types"><ChoiceGroup values={employmentOptions} selected={openToWork.employmentTypes} onToggle={(value) => toggleValue("employmentTypes", value)} /></FieldLabel>
          <FieldLabel label="Visibility (who can view you’re open to work) *"><div className="space-y-3"><RadioChoice checked={openToWork.visibility === "recruiters"} label="Recruiters only" description="Only visible to people using recruiter tools." onChange={() => updateOpen("visibility", "recruiters")} /><RadioChoice checked={openToWork.visibility === "everyone"} label="Everyone on CareerLink" description="Adds an open-to-work frame to your profile." onChange={() => updateOpen("visibility", "everyone")} /><RadioChoice checked={openToWork.visibility === "only-me"} label="Visible only to you" description="Used only to personalize job recommendations." onChange={() => updateOpen("visibility", "only-me")} /></div></FieldLabel>
          <footer className="sticky bottom-[-1.25rem] -mx-5 mt-6 flex justify-between border-t border-gray-200 bg-white px-5 py-4 sm:-mx-7 sm:px-7"><button type="button" onClick={() => setPage("home")} className="text-sm text-gray-600 hover:text-ink"><ArrowLeft size={15} className="mr-1 inline" />Back</button><button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Save</button></footer>
        </form>}

        {page === "alerts" && <form className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7" onSubmit={(event) => { event.preventDefault(); save("alerts"); }}>
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-sky p-4"><BellRing className="mt-0.5 shrink-0 text-brand" size={20} /><p className="text-sm leading-5 text-gray-700">Get a notification when new jobs match your search. Your alert is saved to this account on this device.</p></div>
          <FieldLabel label="Job title or keyword"><input className={inputClass} value={jobAlerts.title} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, title: event.target.value } }))} placeholder="e.g. Product designer" required={jobAlerts.enabled} /></FieldLabel>
          <FieldLabel label="Location"><input className={inputClass} value={jobAlerts.location} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, location: event.target.value } }))} placeholder="City, region or Remote" /></FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Workplace type"><select className={inputClass} value={jobAlerts.workMode || ""} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, workMode: event.target.value } }))}><option value="">Any workplace</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select></FieldLabel>
            <FieldLabel label="Employment type"><select className={inputClass} value={jobAlerts.type || ""} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, type: event.target.value } }))}><option value="">Any type</option>{["Full-time", "Part-time", "Contract", "Temporary", "Internship"].map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
            <FieldLabel label="Experience level"><select className={inputClass} value={jobAlerts.level || ""} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, level: event.target.value } }))}><option value="">Any level</option>{["Internship", "Entry level", "Associate", "Mid-Senior", "Director", "Executive"].map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
          </div>
          <FieldLabel label="Frequency"><select className={inputClass} value={jobAlerts.frequency} onChange={(event) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, frequency: event.target.value } }))}><option>Daily</option><option>Weekly</option></select></FieldLabel>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"><span><span className="block text-sm font-medium">Turn on this job alert</span><span className="mt-1 block text-xs text-muted-ink">You can change or remove it at any time.</span></span><Switch checked={jobAlerts.enabled} label="Job alert" onChange={(checked) => setDraft((current) => ({ ...current, jobAlerts: { ...current.jobAlerts, enabled: checked } }))} /></label>
          <footer className="mt-6 flex justify-between border-t border-gray-200 pt-4"><button type="button" onClick={() => setPage("home")} className="text-sm text-gray-600 hover:text-ink"><ArrowLeft size={15} className="mr-1 inline" />Back</button><div className="flex gap-2"><button type="button" onClick={() => {
            const next = { ...draft, jobAlerts: { ...draft.jobAlerts, enabled: false, title: "", location: "" } };
            onSave(next, "alerts");
            onClose();
          }} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Delete alert</button><button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Save</button></div></footer>
        </form>}
      </section>
    </div>
  );
}

function FieldLabel({ label, children }) {
  return <label className="mb-5 block text-sm font-medium text-ink">{label}{children}</label>;
}

function ChoiceGroup({ values, selected, onToggle }) {
  return <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => {
    const active = selected.includes(value);
    return <button key={value} type="button" aria-pressed={active} onClick={() => onToggle(value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-emerald-700"}`}>{active ? <Check size={13} className="mr-1 inline" /> : null}{value}</button>;
  })}</div>;
}

function RadioChoice({ checked, label, description, onChange }) {
  return <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-emerald-700" /><span><span className="font-medium text-ink">{label}</span>{description && <span className="mt-0.5 block text-xs leading-5 text-muted-ink">{description}</span>}</span></label>;
}

function Switch({ checked, label, onChange }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-700" : "bg-gray-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button>;
}
