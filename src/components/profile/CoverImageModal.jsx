import { X, Upload, Eye, Trash2 } from "lucide-react";

const CoverImageModal = ({
  open,
  hasImage,
  onClose,
  onUpload,
  onView,
  onRemove,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Cover Photo
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <button
            type="button"
            onClick={onUpload}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-black/5"
          >
            <Upload size={19} />
            Upload cover photo
          </button>

          {hasImage && (
            <>
              <button
                type="button"
                onClick={onView}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-black/5"
              >
                <Eye size={19} />
                View cover photo
              </button>

              <button
                type="button"
                onClick={onRemove}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={19} />
                Remove cover photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverImageModal;