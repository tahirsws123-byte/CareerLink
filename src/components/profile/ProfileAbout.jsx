import { useState } from "react";
import Card from "../layout/Card";
import { updateProfile } from "../../services/userServices.js";

const ProfileAbout = ({ bio, isMe, onSaved }) => {
  const [openModal, setOpenModal] = useState(false);
  const [value, setValue] = useState(bio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = () => {
    setValue(bio || "");
    setError("");
    setOpenModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const data = await updateProfile({
        bio: value.trim(),
      });

      onSaved(data.user.bio);
      setOpenModal(false);
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.message ||
          "Failed to save bio. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="about" className="scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">The story behind your work</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">About</h2>
        </div>

        {isMe && (
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-full border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand hover:bg-sky hover:text-brand"
          >
            {bio ? "Edit" : "Add"}
          </button>
        )}
      </div>

      {bio ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">
          {bio}
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-sm leading-6 text-muted-ink">
          {isMe
            ? "Add a summary about yourself."
            : "No summary is available for this profile yet."}
        </p>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-ink">
              {bio ? "Edit About" : "Add About"}
            </h3>

            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Write something about yourself..."
              rows={7}
              maxLength={2000}
              disabled={saving}
              className="mt-4 w-full resize-none rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />

            <div className="mt-1 text-right text-xs text-muted-ink">
              {value.length}/2000
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpenModal(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted-ink hover:bg-black/5"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProfileAbout;