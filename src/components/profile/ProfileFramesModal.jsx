import { Eye, X } from "lucide-react";
import ProfileAvatar from "../layout/ProfileAvatar.jsx";
import ProfileFrameBadge from "./ProfileFrameBadge.jsx";

const options = [
  { value: "", label: "Original" },
  { value: "open-to-work", label: "#OpenToWork" },
  { value: "hiring", label: "#Hiring" },
];

export default function ProfileFramesModal({
  open,
  name,
  profilePicture,
  selectedFrame,
  saving,
  onSelect,
  onClose,
  onApply,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-frames-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-[#1c2023] text-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/15 px-5 py-4 sm:px-7">
          <h2 id="profile-frames-title" className="text-xl font-semibold">Frames</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close frames" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10">
            <X size={24} />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-6 sm:px-8">
          <div className="flex min-h-48 items-center justify-center sm:min-h-72">
            <div className="relative h-44 w-44 sm:h-60 sm:w-60">
              <ProfileAvatar user={{ name, profilePicture }} size={240} className="h-full w-full" />
              <ProfileFrameBadge frame={selectedFrame} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-start justify-center gap-3 sm:gap-5">
            {options.map((option) => (
              <button
                key={option.value || "original"}
                type="button"
                aria-pressed={selectedFrame === option.value}
                onClick={() => onSelect(option.value)}
                className={`flex min-w-24 flex-col items-center rounded-md px-3 py-2 text-sm transition hover:bg-white/10 ${selectedFrame === option.value ? "outline outline-2 outline-white" : ""}`}
              >
                <span className="relative mb-1 block h-16 w-16">
                  <ProfileAvatar user={{ name, profilePicture }} size={64} className="h-full w-full" />
                  <ProfileFrameBadge frame={option.value} />
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className="flex flex-col gap-3 border-t border-white/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="flex items-center gap-2 text-sm text-white/80"><Eye size={19} />Frame visible to everyone</p>
          <button
            type="button"
            disabled={saving || selectedFrame === undefined}
            onClick={onApply}
            className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
          >{saving ? "Applying…" : "Apply"}</button>
        </footer>
      </section>
    </div>
  );
}
