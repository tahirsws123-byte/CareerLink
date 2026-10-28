import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateProfile } from "../../services/userServices.js";
import useTranslation from "../../hooks/useTranslation.js";

const splitName = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
};

const splitLocation = (location = "") => {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { city: location, country: "" };
  return { city: parts.slice(0, -1).join(", "), country: parts.at(-1) };
};

const EditProfileModal = ({ open, user, onClose, onProfileUpdate, onAddEducation }) => {
  const t = useTranslation();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    const { firstName, lastName } = splitName(user.name);
    const oldLocation = splitLocation(user.location);
    setFormData({
      firstName,
      lastName,
      additionalName: user.additionalName || "",
      pronouns: user.pronouns || "",
      headline: user.headline || "",
      city: user.city || oldLocation.city,
      country: user.country || oldLocation.country,
      introEducation: user.introEducation || "",
      industry: user.industry || "",
      contactEmail: user.contactEmail || "",
      contactWebsite: user.contactWebsite || "",
    });
    setError("");
  }, [open, user]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const city = formData.city.trim();
      const country = formData.country.trim();
      const data = await updateProfile({
        name: [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" "),
        additionalName: formData.additionalName,
        pronouns: formData.pronouns,
        headline: formData.headline,
        city,
        country,
        location: [city, country].filter(Boolean).join(", "),
        introEducation: formData.introEducation,
        industry: formData.industry,
        contactEmail: formData.contactEmail,
        contactWebsite: formData.contactWebsite,
      });
      onProfileUpdate(data.user);
      onClose();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || t("Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const educationOptions = (user.education || [])
    .map((item) => item.school)
    .filter((school) => school && school !== formData.introEducation);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-intro-title"
        className="flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 id="edit-intro-title" className="text-xl font-semibold text-gray-900">
            {t("Edit intro")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t("Close")}
            className="grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <p className="text-sm text-gray-600">{t("Tell people a little about yourself")}</p>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("First name")} name="firstName" value={formData.firstName} onChange={handleChange} maxLength={80} required />
              <Field label={t("Last name")} name="lastName" value={formData.lastName} onChange={handleChange} maxLength={80} />
            </div>
            <Field label={t("Additional name")} name="additionalName" value={formData.additionalName} onChange={handleChange} />
            <Field label={t("Pronouns")} name="pronouns" value={formData.pronouns} onChange={handleChange} placeholder="e.g. she/her" />
            <Field
              label={t("Headline")}
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              maxLength={160}
              hint={t("Describe your professional role or focus")}
            />

            <section className="space-y-3 border-t border-gray-200 pt-5">
              <h3 className="text-base font-semibold text-gray-900">{t("Current position")}</h3>
              <p className="text-sm text-gray-600">{t("Add your location and industry to help people find you.")}</p>
              <Field label={t("City")} name="city" value={formData.city} onChange={handleChange} />
              <Field label={t("Country/region")} name="country" value={formData.country} onChange={handleChange} />
              <div>
                <label htmlFor="introEducation" className="mb-1.5 block text-sm font-medium text-gray-800">{t("Education")}</label>
                <input
                  id="introEducation"
                  name="introEducation"
                  list="profile-education-options"
                  value={formData.introEducation || ""}
                  onChange={handleChange}
                  maxLength={140}
                  className={inputClass}
                  placeholder={t("School or institution")}
                />
                <datalist id="profile-education-options">
                  {educationOptions.map((school) => <option key={school} value={school} />)}
                </datalist>
                {onAddEducation && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddEducation();
                    }}
                    className="mt-2 text-sm font-semibold text-brand hover:underline"
                  >
                    {t("Add education")}
                  </button>
                )}
              </div>
              <Field label={t("Industry")} name="industry" value={formData.industry} onChange={handleChange} maxLength={120} />
            </section>

            <section className="space-y-3 border-t border-gray-200 pt-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t("Contact information")}</h3>
                <p className="mt-1 text-sm text-gray-600">{t("Only add contact details you are comfortable sharing.")}</p>
              </div>
              <Field label={t("Contact email")} name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} />
              <Field label={t("Website or portfolio")} name="contactWebsite" type="url" value={formData.contactWebsite} onChange={handleChange} placeholder="https://example.com" />
            </section>
          </div>

          <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-gray-400 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? t("Saving…") : t("Save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

const inputClass = "w-full rounded-md border border-gray-500 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function Field({ label, name, value = "", onChange, type = "text", maxLength, placeholder, hint, required = false }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-gray-800">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

export default EditProfileModal;
