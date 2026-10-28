import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api.js";

const blankJob = {
  title: "",
  company: "",
  location: "",
  type: "",
  level: "",
  workMode: "",
  salary: "",
  industry: "",
  jobFunction: "",
  description: "",
  tags: "",
};
const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

export default function PostJobModal({ onClose, onPosted }) {
  const [form, setForm] = useState(blankJob);
  const [submitting, setSubmitting] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const requiredFields = [
      ["title", "Job title"],
      ["company", "Company"],
      ["location", "Location"],
      ["type", "Employment type"],
      ["level", "Experience level"],
      ["workMode", "Workplace type"],
      ["description", "Job description"],
    ];
    const missingField = requiredFields.find(([field]) => !form[field].trim());
    if (missingField) {
      toast.error(`${missingField[1]} is required`);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/jobs", {
        ...form,
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        salary: form.salary.trim(),
        industry: form.industry.trim(),
        jobFunction: form.jobFunction.trim(),
        description: form.description.trim(),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      onPosted(data.job);
      toast.success("Your job is now live");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to post this job");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3 sm:p-6" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section role="dialog" aria-modal="true" aria-labelledby="post-job-title" className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center border-b border-gray-200 px-5 py-4"><div className="min-w-0 flex-1"><h2 id="post-job-title" className="text-lg font-semibold text-ink">Post a job</h2><p className="mt-0.5 text-sm text-muted-ink">Share the role details so candidates know what to expect.</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button></header>
      <form onSubmit={submit} className="min-h-0 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Job title *"><input className={inputClass} name="title" value={form.title} onChange={update} maxLength="160" required placeholder="e.g. Product Designer" /></FormField>
          <FormField label="Company *"><input className={inputClass} name="company" value={form.company} onChange={update} maxLength="160" required placeholder="Company name" /></FormField>
          <FormField label="Location *"><input className={inputClass} name="location" value={form.location} onChange={update} maxLength="160" required placeholder="City, region or Remote" /></FormField>
          <FormField label="Workplace type *"><select className={inputClass} name="workMode" value={form.workMode} onChange={update} required><option value="">Choose workplace type</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select></FormField>
          <FormField label="Employment type *"><select className={inputClass} name="type" value={form.type} onChange={update} required><option value="">Choose employment type</option>{["Full-time", "Part-time", "Contract", "Temporary", "Internship"].map((type) => <option key={type}>{type}</option>)}</select></FormField>
          <FormField label="Experience level *"><select className={inputClass} name="level" value={form.level} onChange={update} required><option value="">Choose experience level</option>{["Internship", "Entry level", "Associate", "Mid-Senior", "Director", "Executive"].map((level) => <option key={level}>{level}</option>)}</select></FormField>
          <FormField label="Salary range"><input className={inputClass} name="salary" value={form.salary} onChange={update} maxLength="100" placeholder="e.g. $80,000 - $100,000" /></FormField>
          <FormField label="Industry"><input className={inputClass} name="industry" value={form.industry} onChange={update} maxLength="100" placeholder="e.g. Software Development" /></FormField>
          <FormField label="Job function"><input className={inputClass} name="jobFunction" value={form.jobFunction} onChange={update} maxLength="100" placeholder="e.g. Engineering" /></FormField>
          <FormField label="Skills (comma separated)"><input className={inputClass} name="tags" value={form.tags} onChange={update} placeholder="React, Design, SQL" /></FormField>
          <FormField label="Job description *" className="sm:col-span-2"><textarea className={`${inputClass} min-h-36 resize-y`} name="description" value={form.description} onChange={update} maxLength="3000" required placeholder="Describe the role, responsibilities and qualifications." /></FormField>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={submitting} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{submitting ? "Posting…" : "Post job"}</button></div>
      </form>
    </section>
  </div>;
}

function FormField({ label, className = "", children }) {
  return <label className={`block text-sm font-medium text-ink ${className}`}>{label}{children}</label>;
}
