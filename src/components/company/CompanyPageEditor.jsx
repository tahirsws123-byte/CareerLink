import { useEffect, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api.js";

const tabs = ["Page info", "Buttons", "Details", "Workplace"];
const buttonLabels = ["Contact us", "Request demo", "Learn more", "Register", "Sign up", "Visit website", "Visit portfolio", "Visit store"];
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
const workplacePolicies = ["On-site", "Hybrid", "Remote"];
const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-sm font-medium text-gray-700";

const getForm = (page) => ({
  name: page.name || "",
  publicUrlSlug: page.publicUrlSlug || "",
  tagline: page.tagline || "",
  website: page.website || "",
  industry: page.industry || "",
  companySize: page.companySize || "",
  companyType: page.companyType || "",
  overview: page.overview || "",
  phone: page.phone || "",
  yearFounded: page.yearFounded || "",
  specialties: page.specialties || [],
  messagingEnabled: page.messagingEnabled !== false,
  customButton: {
    enabled: Boolean(page.customButton?.enabled),
    label: page.customButton?.label || "Visit website",
    url: page.customButton?.url || "",
  },
  workplace: {
    enabled: Boolean(page.workplace?.enabled),
    policy: page.workplace?.policy || "",
  },
});

export default function CompanyPageEditor({ companyPage, onSaved }) {
  const [form, setForm] = useState(() => getForm(companyPage));
  const [activeTab, setActiveTab] = useState("Page info");
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(getForm(companyPage));
  }, [companyPage]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateNested = (section, key, value) => setForm((current) => ({
    ...current,
    [section]: { ...current[section], [key]: value },
  }));

  const addSpecialty = () => {
    const specialty = specialtyInput.trim();
    if (!specialty || form.specialties.includes(specialty)) return;
    if (form.specialties.length >= 20) {
      toast.error("Add no more than 20 specialties");
      return;
    }
    update("specialties", [...form.specialties, specialty]);
    setSpecialtyInput("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("publicUrlSlug", form.publicUrlSlug);
      payload.append("tagline", form.tagline);
      payload.append("website", form.website);
      payload.append("industry", form.industry);
      payload.append("companySize", form.companySize);
      payload.append("companyType", form.companyType);
      payload.append("overview", form.overview);
      payload.append("phone", form.phone);
      payload.append("yearFounded", String(form.yearFounded));
      payload.append("specialties", JSON.stringify(form.specialties));
      payload.append("messagingEnabled", String(form.messagingEnabled));
      payload.append("customButtonEnabled", String(form.customButton.enabled));
      payload.append("customButtonLabel", form.customButton.label);
      payload.append("customButtonUrl", form.customButton.url);
      payload.append("workplaceEnabled", String(form.workplace.enabled));
      payload.append("workplacePolicy", form.workplace.policy);
      payload.append("removeLogo", String(removeLogo));
      payload.append("removeBanner", String(removeBanner));
      if (logoFile) payload.append("logo", logoFile);
      if (bannerFile) payload.append("banner", bannerFile);

      const { data } = await api.put(`/company-pages/${companyPage._id}`, payload);
      setLogoFile(null);
      setBannerFile(null);
      setRemoveLogo(false);
      setRemoveBanner(false);
      onSaved(data.companyPage);
      toast.success("Company page updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update the company page");
    } finally {
      setSaving(false);
    }
  };

  const logoPreview = logoFile ? logoPreviewUrl : removeLogo ? "" : companyPage.logo?.url;
  const bannerPreview = bannerFile ? bannerPreviewUrl : removeBanner ? "" : companyPage.banner?.url;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-5 py-5 sm:px-7">
        <h2 className="text-xl font-semibold text-ink">Edit page</h2>
        <p className="mt-1 text-sm text-muted-ink">Manage your page’s content</p>
      </header>
      <nav aria-label="Edit page sections" className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-4 py-4 text-sm font-semibold ${activeTab === tab ? "border-emerald-700 text-emerald-800" : "border-transparent text-gray-600 hover:text-ink"}`}>
            {tab}
          </button>
        ))}
      </nav>

      <form onSubmit={submit} className="p-5 sm:p-7">
        <p className="mb-5 text-xs text-muted-ink"><span className="text-red-600">*</span> indicates required</p>

        {activeTab === "Page info" && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-ink">Page info</h3>
            <div className="grid gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
              <ImageField label="Logo" preview={logoPreview} accept="image/jpeg,image/png,image/webp" onChange={(file) => { setLogoFile(file); setRemoveLogo(false); }} onRemove={() => { setLogoFile(null); setRemoveLogo(true); }} />
              <ImageField label="Banner" preview={bannerPreview} accept="image/jpeg,image/png,image/webp" banner onChange={(file) => { setBannerFile(file); setRemoveBanner(false); }} onRemove={() => { setBannerFile(null); setRemoveBanner(true); }} />
            </div>
            <label className={labelClass}>Name <Required />
              <input required maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>CareerLink public URL <Required />
              <div className="flex items-center gap-2">
                <span className="mt-1.5 shrink-0 text-xs text-muted-ink">careerlink.com/company/</span>
                <input required minLength={2} maxLength={80} pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*" value={form.publicUrlSlug} onChange={(event) => update("publicUrlSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-"))} className={inputClass} />
              </div>
            </label>
            <label className={labelClass}>Tagline
              <textarea rows={3} maxLength={120} value={form.tagline} onChange={(event) => update("tagline", event.target.value)} className={inputClass} />
              <span className="mt-1 block text-right text-xs text-muted-ink">{form.tagline.length}/120</span>
            </label>
          </div>
        )}

        {activeTab === "Buttons" && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ink">Set up your page’s buttons</h3>
              <p className="mt-1 text-sm text-muted-ink">Choose how members can get in touch with your page.</p>
            </div>
            <ToggleRow title="Message button" description="Allow CareerLink members to message your page directly." checked={form.messagingEnabled} onChange={(value) => update("messagingEnabled", value)} />
            <div className="border-t border-gray-100 pt-5">
              <ToggleRow title="Custom button" description="Drive traffic to the URL of your choice." checked={form.customButton.enabled} onChange={(value) => updateNested("customButton", "enabled", value)} />
              {form.customButton.enabled && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Button name <Required />
                    <select required value={form.customButton.label} onChange={(event) => updateNested("customButton", "label", event.target.value)} className={inputClass}>
                      {buttonLabels.map((label) => <option key={label}>{label}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>URL <Required />
                    <input required type="url" maxLength={300} value={form.customButton.url} onChange={(event) => updateNested("customButton", "url", event.target.value)} placeholder="https://example.com" className={inputClass} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Details" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-ink">Page details</h3>
              <p className="mt-1 text-sm text-muted-ink">Provide details to display on your page.</p>
            </div>
            <label className={labelClass}>Overview <Required />
              <textarea required rows={5} maxLength={2000} value={form.overview} onChange={(event) => update("overview", event.target.value)} placeholder="Add an About Us with a brief overview of your products and services" className={inputClass} />
              <span className="mt-1 block text-right text-xs text-muted-ink">{form.overview.length}/2,000</span>
            </label>
            <label className={labelClass}>Website URL
              <input type="text" maxLength={300} value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://example.com" className={inputClass} />
            </label>
            <label className={labelClass}>Industry <Required />
              <input required maxLength={100} value={form.industry} onChange={(event) => update("industry", event.target.value)} className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Company size <Required />
                <select required value={form.companySize} onChange={(event) => update("companySize", event.target.value)} className={inputClass}>{companySizes.map((size) => <option key={size}>{size}</option>)}</select>
              </label>
              <label className={labelClass}>Company type <Required />
                <select required value={form.companyType} onChange={(event) => update("companyType", event.target.value)} className={inputClass}>{companyTypes.map((type) => <option key={type}>{type}</option>)}</select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Phone
                <input type="tel" maxLength={30} value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} />
              </label>
              <label className={labelClass}>Year founded
                <input type="number" min="1800" max={new Date().getFullYear()} value={form.yearFounded} onChange={(event) => update("yearFounded", event.target.value)} placeholder="YYYY" className={inputClass} />
              </label>
            </div>
            <div>
              <label className={labelClass} htmlFor="company-page-specialty">Specialties (up to 20)</label>
              <div className="mt-2 flex gap-2">
                <input id="company-page-specialty" maxLength={100} value={specialtyInput} onChange={(event) => setSpecialtyInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSpecialty(); } }} placeholder="Add a specialty" className={`${inputClass} mt-0`} />
                <button type="button" onClick={addSpecialty} className="rounded-full border border-brand px-4 text-sm font-semibold text-brand hover:bg-sky">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.specialties.map((specialty) => <button key={specialty} type="button" onClick={() => update("specialties", form.specialties.filter((item) => item !== specialty))} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">{specialty} <span aria-hidden="true">×</span></button>)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Workplace" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-ink">Workplace module</h3>
              <p className="mt-1 text-sm text-muted-ink">Help your company stand out by highlighting your workplace policy.</p>
            </div>
            <ToggleRow title="Workplace module" description="Show your workplace policy on your Company Page." checked={form.workplace.enabled} onChange={(value) => updateNested("workplace", "enabled", value)} />
            {form.workplace.enabled && (
              <label className={labelClass}>Primary workplace policy <Required />
                <select required value={form.workplace.policy} onChange={(event) => updateNested("workplace", "policy", event.target.value)} className={inputClass}>
                  <option value="">Choose an option</option>
                  {workplacePolicies.map((policy) => <option key={policy}>{policy}</option>)}
                </select>
              </label>
            )}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p><strong>On-site</strong><br />Employees come to work in person.</p>
              <p><strong>Hybrid</strong><br />Employees work on-site and off-site.</p>
              <p><strong>Remote</strong><br />Employees work remotely.</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end border-t border-gray-100 pt-5">
          <button type="submit" disabled={saving} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ImageField({ label, preview, accept, banner = false, onChange, onRemove }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div className={`relative grid overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 ${banner ? "h-28 place-items-center sm:h-32" : "h-32 w-32 place-items-center"}`}>
        {preview
          ? <img src={preview} alt={`${label} preview`} className={`h-full w-full ${banner ? "object-cover" : "object-contain"}`} />
          : <ImagePlus className="text-gray-400" size={banner ? 28 : 32} />}
        <label className="absolute bottom-2 right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:text-brand" title={`Upload ${label.toLowerCase()}`}>
          <Upload size={16} />
          <input type="file" accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onChange(file); }} />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-ink">JPG, PNG, or WEBP. Up to 10 MB.</p>
      {preview && <button type="button" onClick={onRemove} className="mt-1 text-xs font-medium text-red-600 hover:underline">Remove {label.toLowerCase()}</button>}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><h4 className="text-sm font-semibold text-ink">{title}</h4><p className="mt-1 text-sm text-muted-ink">{description}</p></div>
      <button type="button" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-700" : "bg-gray-300"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

function Required() {
  return <span className="text-red-600">*</span>;
}
