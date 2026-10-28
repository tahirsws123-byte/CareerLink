import { useEffect, useState } from "react";
import { updateProfile } from "../../services/userServices.js";

const emptyForm = {
  school: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  currentlyStudying: false,
  grade: "",
  description: "",
};

const EducationModel = ({
  open,
  education,
  educations = [],
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (education) {
      setFormData({
        school: education.school || "",
        degree: education.degree || "",
        fieldOfStudy: education.fieldOfStudy || "",
        startDate: education.startDate
          ? new Date(education.startDate).toISOString().split("T")[0]
          : "",
        endDate: education.endDate
          ? new Date(education.endDate).toISOString().split("T")[0]
          : "",
        currentlyStudying: education.currentlyStudying || false,
        grade: education.grade || "",
        description: education.description || "",
      });
    } else {
      setFormData(emptyForm);
    }

    setError("");
  }, [open, education]);

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

    try {
      setSaving(true);
      setError("");

      const newEducation = {
        ...formData,
        school: formData.school.trim(),
        degree: formData.degree.trim(),
        fieldOfStudy: formData.fieldOfStudy.trim(),
        grade: formData.grade.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate || null,
        endDate: formData.currentlyStudying ? null : formData.endDate || null,
      };

      let updatedEducations;

      if (education) {
        updatedEducations = educations.map((item) =>
          item._id === education._id
            ? {
                ...newEducation,
                _id: education._id,
              }
            : item,
        );
      } else {
        updatedEducations = [...educations, newEducation];
      }

      const data = await updateProfile({
        education: updatedEducations,
      });

      onSaved(data.user.education);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Failed to save education");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-ink">
            {education ? "Edit Education" : "Add Education"}
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

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">School</label>

            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Degree</label>

            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Field of Study
            </label>

            <input
              type="text"
              name="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
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
                disabled={formData.currentlyStudying}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand disabled:bg-gray-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="currentlyStudying"
              checked={formData.currentlyStudying}
              onChange={handleChange}
            />
            I am currently studying here
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">Grade</label>

            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </div>

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

export default EducationModel;
