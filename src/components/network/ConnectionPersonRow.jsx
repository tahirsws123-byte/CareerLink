import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import ProfileAvatar from "../layout/ProfileAvatar";

export default function ConnectionPersonRow({
  user,
  meta,
  actions,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <Link
        to={`/profile/${user?._id}`}
        className="flex min-w-0 items-center gap-3"
      >
        <ProfileAvatar user={user} size={56} />

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink hover:underline">
            {user?.name || "CareerLink member"}
          </h3>

          <p className="line-clamp-2 text-sm text-muted-ink">
            {user?.headline || "CareerLink member"}
          </p>

          {user?.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-ink">
              <MapPin size={12} />
              {user.location}
            </p>
          )}

          {meta && <p className="mt-1 text-xs text-muted-ink">{meta}</p>}
        </div>
      </Link>

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {actions}
      </div>
    </div>
  );
}
