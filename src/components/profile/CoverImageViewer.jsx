import { X } from "lucide-react";

const CoverImageViewer = ({ open, image, name, onClose }) => {
  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={22} />
      </button>

      <img
        src={image}
        alt={`${name}'s cover`}
        className="max-h-[80vh] w-full max-w-5xl rounded-lg object-contain"
      />
    </div>
  );
};

export default CoverImageViewer;