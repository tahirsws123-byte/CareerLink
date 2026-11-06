import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ShieldAlert } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import ProfileAvatar from "./ProfileAvatar";
import { translate } from "../../utils/language";
import { getMyCompanyPages } from "../../services/companyPageServices.js";
import api from "../../services/api.js";

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

export default function MeDropdown({
  compact = false,
  mobile = false,
  onNavigate = () => {},
}) {
  const { user, logout } = useAuth();
  const language = user?.preferredLanguage || "en";

  const [open, setOpen] = useState(false);
  const [companyPages, setCompanyPages] = useState([]);
  const [companyPagesLoading, setCompanyPagesLoading] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  const menuRef = useRef(null);

  const navigate = useNavigate();

  const closeMenu = () => {
    setOpen(false);
    onNavigate();
  };

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setCompanyPagesLoading(true);
    getMyCompanyPages()
      .then((pages) => {
        if (active) setCompanyPages(pages);
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Unable to load your company pages");
      })
      .finally(() => {
        if (active) setCompanyPagesLoading(false);
      });
    api.get("/moderation/access")
      .then(({ data }) => { if (active) setIsModerator(Boolean(data.isModerator)); })
      .catch(() => { if (active) setIsModerator(false); });
    return () => {
      active = false;
    };
  }, [open]);

  const handleLogout = () => {
    closeMenu();
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
    <div ref={menuRef} className={`relative ${mobile ? "w-full" : ""}`}>
      {/* Trigger */}

      <div
        className={
          mobile
            ? "flex w-full min-w-0 flex-col"
            : `flex h-full flex-col items-center justify-center ${compact ? "min-w-0" : "min-w-[76px]"}`
        }
      >
        {mobile ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={translate("Open account menu", language)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
              open ? "bg-sky text-brand" : "text-ink hover:bg-sky"
            }`}
          >
            <ProfileAvatar user={user} size={30} />
            <span className="flex-1">{translate("Me", language)}</span>
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        ) : compact ? <button
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
        {!compact && !mobile && <button
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
        <div
          className={`z-50 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl ${
            mobile
              ? "relative mt-2 max-h-[min(65vh,520px)] w-full"
              : "absolute right-0 mt-2 w-[min(280px,calc(100vw-2rem))]"
          }`}
        >
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
              onClick={closeMenu}
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
              onClick={closeMenu}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              {translate("Settings & Privacy", language)}
            </Link>

            <Link
              to="/settings#language-setting"
              onClick={closeMenu}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              {translate("Language", language)}
            </Link>
          </div>

          <hr />

          {/* Manage */}

          <div className="py-2">
            <h4 className="px-4 pb-1 font-semibold">{translate("Manage", language)}</h4>

            <button onClick={() => { closeMenu(); navigate("/activity"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
              {translate("Posts & Activity", language)}
            </button>

            {(companyPagesLoading || companyPages.length > 0) && (
              <div className="border-t border-gray-100 py-2">
                <h5 className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">My pages</h5>
                {companyPagesLoading && <p className="px-4 py-2 text-sm text-gray-500">Loading pages…</p>}
                {!companyPagesLoading && companyPages.map((page) => (
                  <button
                    key={page._id}
                    type="button"
                    onClick={() => { closeMenu(); navigate(`/company-pages/${page._id}/manage`); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {page.logo?.url ? (
                      <img src={page.logo.url} alt="" className="h-5 w-5 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <Building2 size={17} className="shrink-0 text-muted-ink" />
                    )}
                    <span className="min-w-0 flex-1 truncate">Company: {page.name}</span>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => { closeMenu(); navigate("/jobs/manage"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
              {translate("Job Posting Account", language)}
            </button>
            {isModerator && <Link to="/moderation/reports" onClick={closeMenu} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"><ShieldAlert size={16} />Moderation reports</Link>}
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
