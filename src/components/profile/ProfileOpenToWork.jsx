import { useCallback, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import { updateProfile } from "../../services/userServices.js";

const defaultPreferences = { enabled: false, titles: [], locationTypes: [], locations: [], employmentTypes: [], visibility: "everyone", startDate: "immediately", noticePeriod: "", salary: "" };

export default function ProfileOpenToWork({ value, isMe, onSaved, openEditor = false, onEditorHandled }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(value));

  const showEditor = useCallback(() => {
    setDraft(toDraft(value));
    setOpen(true);
    onEditorHandled?.();
  }, [onEditorHandled, value]);
  const requestHandled = useRef(false);
  useEffect(() => {
    if (!openEditor) {
      requestHandled.current = false;
    } else if (!requestHandled.current) {
      requestHandled.current = true;
      showEditor();
    }
  }, [openEditor, showEditor]);

  const save = async (event) => {
    event.preventDefault();
    const next = {
      ...draft,
      titles: splitList(draft.titles),
      locationTypes: splitList(draft.locationTypes),
      locations: splitList(draft.locations),
      employmentTypes: splitList(draft.employmentTypes),
    };
    try {
      const { user } = await updateProfile({ openToWork: next });
      onSaved(user.openToWork);
      setOpen(false);
      toast.success("Open-to-work preferences updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update open-to-work preferences");
    }
  };

  const preferences = value || defaultPreferences;
  const visibleToViewer = isMe || preferences.visibility === "everyone";
  if (!isMe && (!preferences.enabled || preferences.visibility !== "everyone")) return null;

  return <>
    <Card className={`scroll-mt-24 overflow-hidden ${preferences.enabled && visibleToViewer ? "border-emerald-200" : ""}`}>
      <div className={`flex items-start gap-3 p-5 sm:p-6 ${preferences.enabled && visibleToViewer ? "bg-gradient-to-r from-emerald-50 via-white to-teal-50" : "bg-white"}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><BriefcaseBusiness size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{preferences.enabled ? "Open to work" : "Career interests"}</h2>{preferences.enabled && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Active</span>}</div>{isMe && <button type="button" onClick={showEditor} aria-label="Edit open-to-work preferences" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-ink hover:bg-white"><Pencil size={16} /></button>}</div>
        {preferences.enabled && visibleToViewer ? <><p className="mt-1 text-sm text-gray-700">{preferences.titles?.length ? preferences.titles.join(" · ") : "Exploring new opportunities"}{preferences.locations?.length ? ` · ${preferences.locations.join(", ")}` : ""}</p><div className="mt-3 flex flex-wrap gap-1.5">{[...(preferences.locationTypes || []), ...(preferences.employmentTypes || [])].map((item) => <span key={item} className="rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-emerald-800">{item}</span>)}</div>{preferences.startDate === "immediately" && <p className="mt-2 text-xs text-muted-ink">Available to start immediately</p>}</> : <p className="mt-1 text-sm leading-5 text-muted-ink">{preferences.enabled && !visibleToViewer ? "This member has enabled private career preferences." : "Set the roles, locations and work modes you are interested in."}</p>}
      </div></div>
    </Card>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><form onSubmit={save} className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-ink">Open-to-work preferences</h3><p className="mt-1 text-sm text-muted-ink">Choose what you want to be considered for.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button></div>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"><span><span className="block text-sm font-semibold">Show that I’m open to work</span><span className="mt-1 block text-xs text-muted-ink">You control who can see your career preferences.</span></span><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} className="h-5 w-5 accent-emerald-700" /></label>
      <Field label="Job titles (comma separated)"><input value={draft.titles} onChange={(event) => setDraft({ ...draft, titles: event.target.value })} className={inputClass} placeholder="Software Engineer, Product Designer" /></Field>
      <Field label="Locations (comma separated)"><input value={draft.locations} onChange={(event) => setDraft({ ...draft, locations: event.target.value })} className={inputClass} placeholder="City, region or Remote" /></Field>
      <Field label="Workplace types"><Checks values={["On-site", "Hybrid", "Remote"]} selected={splitList(draft.locationTypes)} onToggle={(value) => setDraft({ ...draft, locationTypes: joinToggle(draft.locationTypes, value) })} /></Field>
      <Field label="Employment types"><Checks values={["Full-time", "Part-time", "Contract", "Temporary", "Internship"]} selected={splitList(draft.employmentTypes)} onToggle={(value) => setDraft({ ...draft, employmentTypes: joinToggle(draft.employmentTypes, value) })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Availability"><select value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className={inputClass}><option value="immediately">Immediately, actively looking</option><option value="flexible">Flexible, casually looking</option></select></Field><Field label="Notice period"><input value={draft.noticePeriod} onChange={(event) => setDraft({ ...draft, noticePeriod: event.target.value })} className={inputClass} placeholder="e.g. 2 weeks" /></Field></div>
      <Field label="Expected annual salary (optional)"><input value={draft.salary} onChange={(event) => setDraft({ ...draft, salary: event.target.value })} className={inputClass} placeholder="e.g. $80,000" /></Field>
      <fieldset className="mt-5"><legend className="text-sm font-medium">Who can see these preferences?</legend><div className="mt-3 space-y-3">{[["everyone", "Everyone"], ["recruiters", "Recruiters only"], ["only-me", "Only me"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="work-visibility" value={value} checked={draft.visibility === value} onChange={() => setDraft({ ...draft, visibility: value })} className="accent-emerald-700" />{label}</label>)}</div></fieldset>
      <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">Save preferences</button></div>
    </form></div>}
  </>;
}

function toDraft(value) {
  const data = { ...defaultPreferences, ...(value || {}) };
  return { ...data, titles: (data.titles || []).join(", "), locations: (data.locations || []).join(", "), locationTypes: (data.locationTypes || []).join(", "), employmentTypes: (data.employmentTypes || []).join(", ") };
}
function splitList(value) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function joinToggle(value, item) { const values = splitList(value); return values.includes(item) ? values.filter((entry) => entry !== item).join(", ") : [...values, item].join(", "); }
function Field({ label, children }) { return <label className="mt-4 block text-sm font-medium text-ink">{label}{children}</label>; }
function Checks({ values, selected, onToggle }) { return <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" aria-pressed={selected.includes(value)} onClick={() => onToggle(value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected.includes(value) ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 text-gray-700 hover:border-emerald-700"}`}>{value}</button>)}</div>; }
const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
