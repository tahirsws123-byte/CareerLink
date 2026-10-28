import { useCallback, useEffect, useState } from "react";
import Card from "../layout/Card";
import ExperienceModal from "./ExperienceModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { updateProfile } from "../../services/userServices.js";

const ProfileExperience = ({
  items = [],
  isMe,
  onExperienceUpdate,
  addExperienceRequested = false,
  onAddExperienceRequestHandled,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [error, setError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [experienceToDelete, setExperienceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = useCallback(() => {
    setSelectedExperience(null);
    setOpenModal(true);
  }, []);

  useEffect(() => {
    if (!addExperienceRequested) return;
    if (isMe) handleAdd();
    onAddExperienceRequestHandled?.();
  }, [addExperienceRequested, handleAdd, isMe, onAddExperienceRequestHandled]);

  const handleEdit = (experience) => {
    setSelectedExperience(experience);
    setOpenModal(true);
  };

  const handleSaved = (updatedExperiences) => {
    onExperienceUpdate(updatedExperiences);
    setOpenModal(false);
  };

  const handleDeleteClick = (experience) => {
    setExperienceToDelete(experience);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!experienceToDelete) return;

    try {
      setDeleting(true);
      setError("");

      const updatedExperiences = items.filter(
        (item) => item._id !== experienceToDelete._id
      );

      const data = await updateProfile({
        experience: updatedExperiences,
      });

      onExperienceUpdate(data.user.experience);

      setShowDeleteModal(false);
      setExperienceToDelete(null);
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.message ||
          "Failed to remove experience. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <section id="experience">
      <Card className="overflow-hidden p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Your professional journey</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Experience</h2>
          </div>

          {isMe && (
            <button
              onClick={handleAdd}
              className="rounded-full border border-brand px-4 py-1 text-sm font-semibold text-brand hover:bg-brand/10"
            >
              Add
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-ink">
            {isMe
              ? "No experience added yet."
              : "No experience is listed on this profile."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {items.map((experience) => (
              <li
                key={experience._id}
                className="flex gap-4 py-5 first:pt-4 last:pb-2"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky to-white text-[13px] font-semibold text-brand ring-1 ring-gray-100">
                  {experience.company
                    ?.split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-ink">
                        {experience.position}
                      </p>

                      <p className="text-[13px] text-ink">
                        {experience.company}
                      </p>

                      <p className="text-[12px] text-muted-ink">
                        {formatDate(experience.startDate)} -{" "}
                        {experience.currentlyWorking
                          ? "Present"
                          : formatDate(experience.endDate)}
                      </p>

                      <p className="text-[12px] text-muted-ink">
                        {[experience.location, experience.locationType]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    {isMe && (
                      <div className="flex shrink-0 gap-3">
                        <button
                          onClick={() => handleEdit(experience)}
                          className="text-sm font-semibold text-brand hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteClick(experience)}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {experience.description && (
                    <p className="mt-1 text-[13px] text-ink">
                      {experience.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ExperienceModal
        open={openModal}
        experience={selectedExperience}
        experiences={items}
        onClose={() => setOpenModal(false)}
        onSaved={handleSaved}
      />

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Delete Experience"
        message="Are you sure you want to delete this experience?"
        loading={deleting}
        onCancel={() => {
          setShowDeleteModal(false);
          setExperienceToDelete(null);
        }}
        onConfirm={handleDelete}
      />
      </section>
    </>
  );
};

export default ProfileExperience;