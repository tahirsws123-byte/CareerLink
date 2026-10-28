import { useEffect, useState } from "react";
import { updateProfile } from "../../services/userServices.js";

const emptyForm = {
  company: "",
  position: "",
  employmentType: "",
  location: "",
  locationType: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  description: "",
};

const ExperienceModal = ({
  open,
  experience,
  onClose,
  onSaved,
  experiences = [],
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (experience) {
      setFormData({
        company: experience.company || "",
        position: experience.position || "",
        employmentType: experience.employmentType || "",
        location: experience.location || "",
        locationType: experience.locationType || "",
        startDate: experience.startDate
          ? new Date(experience.startDate).toISOString().split("T")[0]
          : "",
        endDate: experience.endDate
          ? new Date(experience.endDate).toISOString().split("T")[0]
          : "",
        currentlyWorking: experience.currentlyWorking || false,
        description: experience.description || "",
      });
    } else {
      setFormData(emptyForm);
    }

    setError("");
  }, [open, experience]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company.trim()) {
      setError("Company is required.");
      return;
    }

    if (!formData.position.trim()) {
      setError("Position is required.");
      return;
    }

    if (!formData.location.trim()) {
      setError("Location is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const newExperience = {
        ...formData,
        company: formData.company.trim(),
        position: formData.position.trim(),
        location: formData.location.trim(),
        locationType: formData.locationType,
        description: formData.description.trim(),
        startDate: formData.startDate || null,
        endDate: formData.currentlyWorking ? null : formData.endDate || null,
      };

      let updatedExperiences;

      if (experience) {
        // Edit existing experience
        updatedExperiences = experiences.map((item) =>
          item._id === experience._id
            ? {
                ...newExperience,
                _id: experience._id,
              }
            : item,
        );
      } else {
        // Add new experience
        updatedExperiences = [...experiences, newExperience];
      }

      const data = await updateProfile({
        experience: updatedExperiences,
      });

      onSaved(data.user.experience);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Failed to save experience");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-modal-title"
        className="my-auto flex max-h-[min(90dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-ink">
            <span id="experience-modal-title">
            {experience ? "Edit Experience" : "Add Experience"}
            </span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-2xl text-muted-ink hover:text-black"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Company</label>

            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Position</label>

            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Employment Type
            </label>

            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            >
              <option value="">Select employment type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Self-employed">Self-employed</option>
              <option value="Freelance">Freelance</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>

            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Location type</label>
            <select
              name="locationType"
              value={formData.locationType}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            >
              <option value="">Select location type</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date
              </label>

              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">End Date</label>

              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={formData.currentlyWorking}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand disabled:bg-gray-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="currentlyWorking"
              checked={formData.currentlyWorking}
              onChange={handleChange}
            />
            I currently work here
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExperienceModal;
