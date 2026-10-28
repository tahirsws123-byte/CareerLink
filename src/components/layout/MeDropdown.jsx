import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import ProfileAvatar from "./ProfileAvatar";
import { translate } from "../../utils/language";

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

export default function MeDropdown({ compact = false }) {
  const { user, logout } = useAuth();
  const language = user?.preferredLanguage || "en";

  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();

    toast.success("logged out successfully");

    navigate("/", { replace: true });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}

      <div className={`flex h-full flex-col items-center justify-center ${compact ? "min-w-0" : "min-w-[76px]"}`}>
        {compact ? <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={translate("Open profile menu", language)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex overflow-hidden rounded-full"
        ><ProfileAvatar user={user} size={30} /></button> : <Link
          to={`/profile/${user?._id}`}
          aria-label={translate("View your profile", language)}
          className="inline-flex overflow-hidden rounded-full"
        ><ProfileAvatar user={user} size={24} /></Link>}
        {!compact && <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center !text-xs font-normal leading-4 text-muted-ink hover:text-ink"
        >
          {translate("Me", language)} <ChevronDown size={12} className="ml-0.5" />
        </button>}
      </div>

      {/* Dropdown */}

      {open && (
        <div className="absolute right-0 mt-2 w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Top */}

          <div className="p-4">
            <div className="flex gap-3">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full">
                  <Avatar
                    initials={getInitials(user?.name)}
                    color={getAvatarColor(user?.name)}
                    size={56}
                  />
                </div>
              )}

              <div>
                <h3 className="font-semibold">{user?.name}</h3>

                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <Link
              to={`/profile/${user?._id}`}
              className="mt-4 block rounded-full border border-[#0A66C2] py-2 text-center text-sm font-semibold text-[#0A66C2] hover:bg-blue-50"
            >
              {translate("View Profile", language)}
            </Link>
          </div>

          <hr />

          {/* Account */}

          <div className="py-2">
            <h4 className="px-4 pb-1 font-semibold">{translate("Account", language)}</h4>

            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              {translate("Settings & Privacy", language)}
            </Link>

            <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
              {translate("Help", language)}
            </button>

            <Link
              to="/settings#language-setting"
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              {translate("Language", language)}
            </Link>
          </div>

          <hr />

          {/* Manage */}

          <div className="py-2">
            <h4 className="px-4 pb-1 font-semibold">{translate("Manage", language)}</h4>

            <button onClick={() => { setOpen(false); navigate("/activity"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
              {translate("Posts & Activity", language)}
            </button>

            <button onClick={() => { setOpen(false); navigate("/jobs/manage"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
              {translate("Job Posting Account", language)}
            </button>
          </div>

          <hr />

          <div className="py-2">
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
            >
              {translate("Sign Out", language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
