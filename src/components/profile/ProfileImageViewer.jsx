const ProfileImageViewer = ({
  open,
  image,
  name,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white p-2 text-black shadow hover:bg-gray-100"
        >
          ✕
        </button>

        <img
          src={image}
          alt={name}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        />
      </div>
    </div>
  );
};

export default ProfileImageViewer;