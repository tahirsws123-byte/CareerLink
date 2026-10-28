import { useState } from "react";
import Card from "../layout/Card";
import SkillModal from "./SkillModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal.jsx";
import { updateProfile } from "../../services/userServices.js";

const ProfileSkills = ({ items = [], isMe, onSaved }) => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = () => {
    setError("");
    setSelectedSkill("");
    setOpenModal(true);
  };

  const handleEdit = (skill) => {
    setError("");
    setSelectedSkill(skill);
    setOpenModal(true);
  };

  const handleDeleteClick = (skill) => {
    setSkillToDelete(skill);
    setShowDeleteModal(true);
  };

  const handleSkillSaved = async (value) => {
    try {
      setSaving(true);

      const exists = items.some(
        (item) =>
          item.toLowerCase() === value.toLowerCase() && item !== selectedSkill,
      );

      if (exists) {
        setError("This skill is already added.");
        setSaving(false);
        return;
      }

      let updatedSkills;

      if (selectedSkill) {
        updatedSkills = items.map((item) =>
          item === selectedSkill ? value : item,
        );
      } else {
        updatedSkills = [...items, value];
      }

      const data = await updateProfile({
        skills: updatedSkills,
      });

      onSaved(data.user.skills);

      setOpenModal(false);
      setSelectedSkill("");
      setError("");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);

      const updatedSkills = items.filter((skill) => skill !== skillToDelete);

      const data = await updateProfile({
        skills: updatedSkills,
      });

      onSaved(data.user.skills);

      setShowDeleteModal(false);
      setSkillToDelete("");
      setError("");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="skills" className="scroll-mt-24 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Your strengths</p><h2 className="mt-1 text-lg font-semibold text-ink">Skills</h2></div>

        {isMe && (
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            + Add skill
          </button>
        )}
      </div>

      <div className="mt-4">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <div
                key={skill}
                className="group flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 transition hover:border-brand hover:bg-brand/5"
              >
                <span className="text-sm font-medium text-ink">{skill}</span>

                {isMe && (
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => handleEdit(skill)}
                      className="grid h-6 w-6 place-items-center rounded-full text-muted-ink hover:bg-black/5 hover:text-brand"
                      title="Edit skill"
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(skill)}
                      className="grid h-6 w-6 place-items-center rounded-full text-muted-ink hover:bg-red-50 hover:text-red-600"
                      title="Delete skill"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
            <p className="text-sm text-muted-ink">
              {isMe
                ? "No skills added yet."
                : "No skills listed on this profile."}
            </p>

            {isMe && (
              <button
                type="button"
                onClick={handleAdd}
                className="mt-2 text-sm font-semibold text-brand hover:underline"
              >
                Add your first skill
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <SkillModal
        open={openModal}
        skill={selectedSkill}
        onClose={() => {
          if (!saving) {
            setOpenModal(false);
            setSelectedSkill("");
            setError("");
          }
        }}
        onSaved={handleSkillSaved}
      />

      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Delete Skill"
        message={`Are you sure you want to delete "${skillToDelete}"?`}
        loading={saving}
        onCancel={() => {
          setShowDeleteModal(false);
          setSkillToDelete("");
        }}
        onConfirm={handleDelete}
      />
    </Card>
  );
};

export default ProfileSkills;
