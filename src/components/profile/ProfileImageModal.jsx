const ProfileImageModal = ({
  open,
  onClose,
  hasImage,
  onView,
  onFrames,
  onUpload,
  onRemove,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20">
      <div className="w-80 overflow-hidden rounded-xl bg-white shadow-xl">

        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            Profile Photo
          </h2>
        </div>

        <div className="flex flex-col">
          <button
            type="button"
            onClick={onFrames}
            className="px-5 py-4 text-left hover:bg-gray-100"
          >
            ✨ Frames
          </button>

          {hasImage && (
            <button
              onClick={onView}
              className="px-5 py-4 text-left hover:bg-gray-100"
            >
              👁 View Photo
            </button>
          )}

          <button
            onClick={onUpload}
            className="px-5 py-4 text-left hover:bg-gray-100"
          >
            📷 {hasImage ? "Upload New Photo" : "Upload Photo"}
          </button>

          {hasImage && (
            <button
              onClick={onRemove}
              className="px-5 py-4 text-left text-red-600 hover:bg-red-50"
            >
              🗑 Remove Photo
            </button>
          )}

          <button
            onClick={onClose}
            className="border-t px-5 py-4 text-left hover:bg-gray-100"
          >
            Cancel
          </button>

        </div>
      </div>
    </div>
  );
};

export default ProfileImageModal;