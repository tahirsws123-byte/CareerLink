import { useState } from "react";
import Card from "../layout/Card";
import EducationModal from "./EducationModal";
import { Pencil, Trash2, Plus } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal.jsx";
import { deleteEducation } from "../../services/userServices.js";

const ProfileEducation = ({ items = [], isMe, onEducationUpdate }) => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedEducation, setSelectedEducation] = useState(null);
  const [educationToDelete, setEducationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const handleAdd = () => {
    setSelectedEducation(null);
    setOpenModal(true);
  };

  const handleEdit = (education) => {
    setSelectedEducation(education);
    setOpenModal(true);
  };

  const handleSaved = (updatedEducations) => {
    onEducationUpdate(updatedEducations);
    setOpenModal(false);
  };

  const handleDelete = (education) => {
    setEducationToDelete(education);
  };

  const confirmDelete = async () => {
    if (!educationToDelete) return;

    try {
      setDeleting(true);
      setError("");

      const data = await deleteEducation(educationToDelete._id);

      onEducationUpdate(data.education);

      setEducationToDelete(null);
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.message ||
          "Failed to remove education. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card id="education" className="scroll-mt-24 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Learning &amp; growth</p><h2 className="mt-1 text-lg font-semibold text-ink">Education</h2></div>

        {isMe && (
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-muted-ink transition hover:bg-black/5 hover:text-brand"
          >
            <Plus size={18} />
            <span>Add</span>
          </button>
        )}
      </div>

      {/* Education List */}
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {items.map((education) => (
            <li key={education._id || education.id} className="flex gap-4 py-5 first:pt-4 last:pb-2">
              {/* School Icon */}
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-50 to-white text-sm font-bold text-amber-700 ring-1 ring-gray-100">
                {education.school
                  ?.split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">
                      {education.school}
                    </p>

                    <p className="mt-0.5 text-[13px] text-ink">
                      {education.degree}
                      {education.fieldOfStudy && `, ${education.fieldOfStudy}`}
                    </p>

                    <p className="mt-1 text-[12px] text-muted-ink">
                      {formatDate(education.startDate)}
                      {" - "}
                      {education.currentlyStudying
                        ? "Present"
                        : formatDate(education.endDate)}
                    </p>
                  </div>

                  {/* Actions */}
                  {isMe && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(education)}
                        title="Edit education"
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-ink transition hover:bg-black/5 hover:text-brand"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(education)}
                        title="Delete education"
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-ink transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                {education.grade && (
                  <p className="mt-2 text-[12px] text-muted-ink">
                    Grade: {education.grade}
                  </p>
                )}

                {education.description && (
                  <p className="mt-2 text-[13px] leading-5 text-ink">
                    {education.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-ink">
            {isMe
              ? "No education added yet."
              : "No education is listed on this profile."}
          </p>

          {isMe && (
            <button
              type="button"
              onClick={handleAdd}
              className="mt-3 text-sm font-semibold text-brand hover:underline"
            >
              Add your education
            </button>
          )}
        </div>
      )}

      {/* Education Modal */}
      <EducationModal
        open={openModal}
        education={selectedEducation}
        educations={items}
        onClose={() => setOpenModal(false)}
        onSaved={handleSaved}
      />
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <DeleteConfirmationModal
        open={!!educationToDelete}
        title="Delete Education"
        message="Are you sure you want to delete this education?"
        loading={deleting}
        onCancel={() => setEducationToDelete(null)}
        onConfirm={confirmDelete}
      />
    </Card>
  );
};

export default ProfileEducation;
