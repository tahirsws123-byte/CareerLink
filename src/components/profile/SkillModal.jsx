import { X } from "lucide-react";
import { useEffect, useState } from "react";

const SkillModal = ({ open, skill, onClose, onSaved, loading = false }) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(skill || "");
  }, [skill, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedSkill = value.trim();

    if (!trimmedSkill) return;

    onSaved(trimmedSkill);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold text-ink">
              {skill ? "Edit skill" : "Add skill"}
            </h2>

            <p className="mt-0.5 text-xs text-muted-ink">
              {skill
                ? "Update your skill"
                : "Add a skill to your profile"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-ink transition hover:bg-black/5 hover:text-ink disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5">
          <label className="text-sm font-semibold text-ink">
            Skill
          </label>

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. JavaScript"
            disabled={loading}
            autoFocus
            className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted-ink focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-black/5"
          />

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted-ink transition hover:bg-black/5 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!value.trim() || loading}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : skill
                  ? "Update"
                  : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SkillModal;