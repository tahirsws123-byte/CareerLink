import { Link } from "react-router-dom";
import {
  Bookmark,
  CalendarDays,
  MapPin,
  Newspaper,
  Plus,
  UserRound,
  UsersRound,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import Avatar from "../layout/Avatar";
import { useEffect, useState } from "react";
import { getConnectionCount } from "../../services/connectionServices.js";
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

export default function ProfileCard({
  variant = "default",
  onExperienceClick,
  experienceDisabled = false,
}) {
  const { user } = useAuth();
  const t = useTranslation();
  const isNotificationsCard = variant === "notifications";
  const [connectionCount, setConnectionCount] = useState(null);

  useEffect(() => {
    if (variant !== "default") return undefined;
    let active = true;
    getConnectionCount()
      .then((count) => {
        if (active) setConnectionCount(count);
      })
      .catch((error) => {
        console.error("Unable to load connection count:", error);
      });
    return () => {
      active = false;
    };
  }, [variant]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-lg">
      <div className="h-16 bg-gradient-to-r from-blue-500 to-sky-300"></div>

      <div className="-mt-8 flex flex-col items-center p-4">
        {user?.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={user?.name || "Profile"}
            className="h-16 w-16 rounded-full border-4 border-white"
          />
        ) : (
          <div className="h-16 w-16 rounded-full border-4 border-white">
            <Avatar
              initials={getInitials(user?.name)}
              color={getAvatarColor(user?.name)}
              size={64}
            />
          </div>
        )}

        <h2 className="mt-2 max-w-full truncate font-semibold">{user?.name || "Saad Khan"}</h2>

        <p className="text-center text-sm text-gray-500">
          {user?.headline || "Full Stack Developer"}
        </p>
        {user?.location && (
          <p className="mt-1 inline-flex items-center gap-1 text-center text-xs text-gray-500">
            <MapPin size={13} />
            {user.location}
          </p>
        )}
        {variant === "default" && user?._id && (
          <Link
            to={`/profile/${user._id}?addExperience=true#experience`}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-brand hover:bg-gray-50 hover:text-brand"
          >
            <Plus size={17} className="text-brand" />
            Experience
          </Link>
        )}
      </div>

      <hr />

      {variant === "dashboard" ? (
        <Link to={`/profile/${user?._id}`} className="flex items-center justify-between px-4 py-4 text-sm font-medium text-brand hover:bg-gray-50">
          <span>{t("View profile")}</span>
          <UserRound size={17} />
        </Link>
      ) : variant === "activity" ? (
        <Link
          to="/network/following"
          className="flex items-center justify-between px-4 py-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
        >
          <span>{t("Followers")}</span>
          <span className="inline-flex items-center gap-2 font-semibold text-brand">
            {Number(user?.followersCount ?? user?.followerCount ?? user?.followers?.length ?? 0).toLocaleString()}
            <UsersRound size={17} />
          </span>
        </Link>
      ) : isNotificationsCard ? (
        <button
          type="button"
          onClick={onExperienceClick}
          disabled={experienceDisabled}
          className="flex w-full items-center justify-between px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
        >
          <span>{t("Experience")}</span>
          <Plus size={19} className="text-brand" />
        </button>
      ) : variant === "jobs" ? (
        <Link
          to={`/profile/${user?._id}?addExperience=true#experience`}
          className="flex items-center justify-between px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>{t("Experience")}</span>
          <Plus size={19} className="text-brand" />
        </Link>
      ) : (
        <div>
          <nav aria-label="Your shortcuts" className="p-2">
            <Link
              to="/network/connections"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
            >
              <UserRound size={17} className="text-muted-ink" />
              {t("Connections")}
              <span className="ml-auto font-semibold text-brand" aria-label="Connection count">
                {connectionCount === null ? "—" : connectionCount.toLocaleString()}
              </span>
            </Link>
            <Link
              to="/saved"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
            >
              <Bookmark size={17} className="text-muted-ink" />
              {t("Saved items")}
            </Link>
            <Link
              to="/groups"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
            >
              <UsersRound size={17} className="text-muted-ink" />
              {t("Groups")}
            </Link>
            <Link
              to="/events"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
            >
              <CalendarDays size={17} className="text-muted-ink" />
              {t("Events")}
            </Link>
            <Link
              to="/newsletters"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-brand"
            >
              <Newspaper size={17} className="text-muted-ink" />
              {t("Newsletters")}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}