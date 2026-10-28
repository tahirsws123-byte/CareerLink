import ComposePost from "./ComposePost";
import useAuth from "../../hooks/useAuth";
import Avatar from "../layout/Avatar";

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

export default function TopProfileCompose({ onPost }) {
  const { user } = useAuth();

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-sky-300 px-4 py-2">
        <div className="-mt-8 flex items-center justify-center">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user?.name}
              className="h-16 w-16 rounded-full border-4 border-white shadow-md"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-4 border-white shadow-md">
              <Avatar
                initials={getInitials(user?.name)}
                color={getAvatarColor(user?.name)}
                size={64}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 text-center">
        <h2 className="font-semibold text-base">{user?.name}</h2>
        <p className="text-sm text-gray-500">{user?.title || "Full Stack Developer"}</p>

        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <div className="text-xs text-gray-500">Profile viewers</div>
            <div className="font-semibold text-blue-600">{Number(user?.profileViews || 0)}</div>
          </div>

          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <div className="text-xs text-gray-500">Post impressions</div>
            <div className="font-semibold text-blue-600">{Number(user?.postImpressions || 0)}</div>
          </div>
        </div>
      </div>

      <div className="border-t" />

      <div className="p-3">
        <ComposePost onPost={onPost} plain />
      </div>
    </div>
  );
}
