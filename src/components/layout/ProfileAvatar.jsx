import Avatar from "./Avatar";
import { useState } from "react";
import { getAvatarColor, getInitials } from "../../utils/avatar";
import useAuth from "../../hooks/useAuth.js";

export default function ProfileAvatar({
  user,
  size = 48,
  className = "",
  ring = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { user: viewer } = useAuth();
  const isViewer = Boolean(viewer?._id && (
    (user?._id && viewer._id === user._id)
    || (!user?._id && viewer.name && viewer.name === user?.name)
  ));
  const visibility = viewer?.profilePhotoVisibility || "all";
  const isConnection = user?.viewerIsConnection || user?.connectionStatus?.status === "connected";
  const isInNetwork = isConnection || user?.isFollowing
    || viewer?.following?.some((id) => String(id?._id || id) === String(user?._id));
  const canShowPhoto = isViewer
    || visibility === "all"
    || (visibility === "connections" && isConnection)
    || (visibility === "network" && isInNetwork);

  if (user?.profilePicture && !imageFailed && canShowPhoto) {
    return (
      <img
        src={user.profilePicture}
        alt={user.name || "Profile"}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-white" : ""} ${className}`}
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <Avatar
      initials={getInitials(user?.name)}
      color={getAvatarColor(user?.name)}
      size={size}
      className={className}
      ring={ring}
    />
  );
}
