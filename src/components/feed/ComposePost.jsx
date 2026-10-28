import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Image, Video, PenSquare } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import Avatar from "../layout/Avatar";
import toast from "react-hot-toast";
import useTranslation from "../../hooks/useTranslation";

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  if (!name) return colors[0];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function ComposePost({ onPost, plain = false }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const { user } = useAuth();
  const t = useTranslation();
  const navigate = useNavigate();

  const Top = (
    <div>
      <div className="flex gap-3 items-center">
        <Link
          to={`/profile/${user?._id}`}
          className="inline-flex h-10 w-10 overflow-hidden rounded-full"
        >
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Avatar
              initials={getInitials(user?.name)}
              color={getAvatarColor(user?.name)}
              size={40}
            />
          )}
        </Link>

        <button
          onClick={() => setOpen(true)}
          className={`flex-1 ${plain ? "rounded-lg px-4 py-2" : "rounded-full px-5 py-3"} border border-gray-300 text-left text-gray-600 hover:bg-gray-50`}
        >
          {t("Start a post")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2">
        <ComposeAction
          icon={<Image size={18} className="text-blue-600" />}
          label={t("Photo")}
          onClick={() => fileInputRef.current?.click()}
        />

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files[0];

            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
              alert("Image size must be less than 5 MB.");
              e.target.value = "";
              return;
            }

            setSelectedImage(file);
            setSelectedVideo(null);
            setOpen(true);
          }}
          className="hidden"
        />

        <ComposeAction
          icon={<Video size={18} className="text-green-600" />}
          label={t("Video")}
          onClick={() => videoInputRef.current?.click()}
        />

        <input
          type="file"
          accept="video/mp4,video/webm"
          ref={videoInputRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const allowedTypes = ["video/mp4", "video/webm"];

            if (!allowedTypes.includes(file.type)) {
              toast.error("Only mp4 and webm videos are suitable");
              return;
            }

            if (file.size > 5 * 1024 * 1024) {
              toast.error("Video must be less than 5 MB");
              return;
            }

            setSelectedVideo(file);
            setSelectedImage(null);
            setOpen(true);
          }}
        />

        <ComposeAction
          icon={<PenSquare size={18} className="text-red-500" />}
          label={t("Write article")}
          onClick={() => navigate("/articles/new")}
        />
      </div>
    </div>
  );

  const Textarea = open && (
    <div className="mt-4 border-t pt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("What do you want to talk about?")}
        className="min-h-[120px] w-full resize-none rounded-md border border-gray-300 p-3 outline-none focus:border-blue-500"
      />

      {selectedImage && (
        <div className="mt-3 flex items-start gap-2">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowImageViewer(true)}
              className="block overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Selected"
                className="h-20 w-20 object-cover transition group-hover:brightness-90"
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setShowImageViewer(false);
              }}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-sm text-white hover:bg-black"
            >
              ×
            </button>
          </div>

          <p className="pt-1 text-xs text-gray-500">{t("Click image to preview")}</p>
        </div>
      )}

      {selectedVideo && (
        <video
          src={URL.createObjectURL(selectedVideo)}
          controls
          className="mt-3 w-full max-h-[400px] rounded-lg object-contain"
        />
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setText("");
            setSelectedImage(null);
            setSelectedVideo(null);
          }}
          className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
        >
          {t("Cancel")}
        </button>

        <button
          disabled={!text.trim() && !selectedImage && !selectedVideo}
          onClick={() => {
            console.log("POST BUTTON CLICKED");
            onPost({
              text: text.trim(),
              image: selectedImage,
              video: selectedVideo,
            });
            setText("");
            setSelectedImage(null);
            setSelectedVideo(null);
            setOpen(false);
          }}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("Post")}
        </button>
      </div>
    </div>
  );

  const imageViewer = showImageViewer && selectedImage && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={() => setShowImageViewer(false)}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={URL.createObjectURL(selectedImage)}
          alt="Selected preview"
          className="max-h-[85vh] max-w-full rounded-lg object-contain"
        />

        <button
          type="button"
          onClick={() => setShowImageViewer(false)}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-xl text-white hover:bg-black"
        >
          ×
        </button>
      </div>
    </div>
  );

  if (plain) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {Top}
        {Textarea}
        {imageViewer}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {Top}
      {Textarea}
      {imageViewer}
    </div>
  );
}

function ComposeAction({ icon, label, onClick }) {
  return (
    <button
      className="flex items-center gap-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100"
      type="button"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
