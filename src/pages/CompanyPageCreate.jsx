import { useEffect, useState } from "react";
import { Building2, Plus, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api.js";

const companySizes = [
  "0–1 employees",
  "2–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "501–1,000 employees",
  "1,001–5,000 employees",
  "5,001–10,000 employees",
  "10,000+ employees",
];

const companyTypes = [
  "Public company",
  "Self-employed",
  "Government agency",
  "Nonprofit",
  "Sole proprietorship",
  "Privately held",
  "Partnership",
];

const initialForm = {
  name: "",
  publicUrlSlug: "",
  website: "",
  industry: "",
  companySize: "",
  companyType: "",
  tagline: "",
};

const inputClass = "mt-1.5 w-full rounded-md border border-gray-400 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-gray-500 focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-sm text-gray-700";

export default function CompanyPageCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!logo) {
      setLogoPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(logo);
    setLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logo]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectLogo = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Choose a JPG, JPEG, or PNG logo");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be 5 MB or smaller");
      return;
    }
    setLogo(file);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
      if (logo) payload.append("logo", logo);
      const { data } = await api.post("/company-pages", payload);
      toast.success("Company page created");
      navigate(`/company-pages/${data.companyPage._id}/manage`, {
        replace: true,
      });
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to create the company page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5">
          <Link to="/feed" className="text-sm font-semibold text-brand hover:underline">← Back to CareerLink</Link>
          <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">Create a Company Page</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-ink">
            Build your organization’s presence and help people learn about your company.
          </p>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <form onSubmit={submitForm} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="mb-5 text-xs text-muted-ink"><span className="text-red-600">*</span> indicates required</p>

              <label className={labelClass}>
                Name<span className="text-red-600">*</span>
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Add your organization’s name"
                  className={inputClass}
                />
              </label>

              <label className={`${labelClass} mt-4`}>
                linkedin.com/company/<span className="text-red-600">*</span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*"
                  value={form.publicUrlSlug}
                  onChange={(event) => updateForm("publicUrlSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-"))}
                  placeholder="Add your unique LinkedIn address"
                  className={inputClass}
                  aria-describedby="company-url-help"
                />
                <span id="company-url-help" className="mt-1 block text-xs text-muted-ink">
                  Use letters, numbers, and single hyphens.
                </span>
              </label>

              <label className={`${labelClass} mt-4`}>
                Website
                <input
                  type="text"
                  maxLength={300}
                  value={form.website}
                  onChange={(event) => updateForm("website", event.target.value)}
                  placeholder="Begin with http://, https:// or www."
                  className={inputClass}
                />
              </label>

              <label className={`${labelClass} mt-4`}>
                Industry<span className="text-red-600">*</span>
                <input
                  required
                  maxLength={100}
                  value={form.industry}
                  onChange={(event) => updateForm("industry", event.target.value)}
                  placeholder="e.g. Information Services"
                  className={inputClass}
                />
              </label>

              <label className={`${labelClass} mt-4`}>
                Organization size<span className="text-red-600">*</span>
                <select required value={form.companySize} onChange={(event) => updateForm("companySize", event.target.value)} className={inputClass}>
                  <option value="">Select company size</option>
                  {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>

              <label className={`${labelClass} mt-4`}>
                Organization type<span className="text-red-600">*</span>
                <select required value={form.companyType} onChange={(event) => updateForm("companyType", event.target.value)} className={inputClass}>
                  <option value="">Select company type</option>
                  {companyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>

              <div className="mt-5">
                <span className={labelClass}>Logo</span>
                <label className="mt-1.5 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 bg-gray-50 px-4 py-4 text-center transition hover:border-brand hover:bg-sky/30">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Upload size={18} />
                    {logo ? "Choose a different file" : "Choose file"}
                  </span>
                  <span className="mt-1 text-xs text-muted-ink">{logo ? logo.name : "Upload to see preview"}</span>
                  <input type="file" accept="image/jpeg,image/png" onChange={selectLogo} className="sr-only" />
                </label>
                <p className="mt-1 text-xs text-muted-ink">300 × 300 px recommended. JPG, JPEG, or PNG; up to 5 MB.</p>
              </div>

              <label className={`${labelClass} mt-5`}>
                Tagline
                <textarea
                  maxLength={120}
                  rows={2}
                  value={form.tagline}
                  onChange={(event) => updateForm("tagline", event.target.value)}
                  placeholder="e.g. An information services firm helping small businesses succeed."
                  className={`${inputClass} resize-y`}
                />
                <span className="mt-1 block text-right text-xs text-muted-ink">{form.tagline.length}/120</span>
                <span className="block text-xs leading-5 text-muted-ink">Use your tagline to briefly describe what your organization does. This can be changed later.</span>
              </label>

              <button type="submit" disabled={saving} className="mt-6 w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                {saving ? "Creating page…" : "Create page"}
              </button>
            </form>

            <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center gap-1 border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-700">
                Page preview
                <span title="Your page will look similar to this preview." className="grid h-4 w-4 place-items-center rounded-full bg-gray-500 text-[10px] font-bold text-white">?</span>
              </div>
              <div className="rounded-b-xl bg-gray-50 p-4 sm:p-5">
                <article className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Company logo preview" className="h-[86px] w-[86px] rounded-md object-cover shadow-sm" />
                  ) : (
                    <div aria-label="Company logo placeholder" className="relative grid h-[86px] w-[86px] place-items-center overflow-hidden rounded-sm bg-gray-100">
                      <div className="absolute bottom-0 left-3 h-12 w-6 bg-[#8999a9]" />
                      <div className="absolute bottom-0 left-8 h-[76px] w-11 bg-[#9fb1c5]" />
                      <div className="absolute bottom-0 left-3 h-8 w-6 bg-[#66778a]" />
                      <Building2 size={18} className="relative z-10 text-white/80" />
                    </div>
                  )}
                  <h2 className="mt-2 break-words text-xl font-semibold text-gray-900">{form.name.trim() || "Company name"}</h2>
                  <p className="mt-1 break-words text-sm text-gray-600">{form.tagline.trim() || "Tagline"}</p>
                  <p className="mt-1 break-words text-sm text-gray-500">{form.industry.trim() || "Industry"}</p>
                  <button type="button" disabled className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#2d6ac7] px-4 py-1.5 text-sm font-semibold text-white opacity-95">
                    <Plus size={15} /> Follow
                  </button>
                </article>
              </div>
            </aside>
          </div>
      </div>
    </div>
  );
}
