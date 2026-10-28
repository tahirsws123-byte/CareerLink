import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Home,
  Menu,
  MessageSquare,
  Search,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import MeDropdown from "./MeDropdown";
import BusinessDropdown from "./BusinessDropdown";
import ProfileAvatar from "./ProfileAvatar";
import useAuth from "../../hooks/useAuth";
import { translate } from "../../utils/language";
import { getUnreadNotificationCount } from "../../services/notificationServices";
import { getUnreadMessageCount } from "../../services/messageServices";
import { UNREAD_COUNTS_CHANGED } from "../../utils/unreadEvents";

const primaryItems = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/network", label: "Network", icon: Users },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/messages", label: "Messaging", icon: MessageSquare, count: "messages" },
  { to: "/notifications", label: "Notifications", icon: Bell, count: "notifications" },
];

function isActive(pathname, to) {
  return to === "/feed" ? pathname === to : pathname.startsWith(to);
}

export default function AuthenticatedHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const language = user?.preferredLanguage || "en";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const loadUnreadCounts = useCallback(async () => {
    const [notifications, messages] = await Promise.allSettled([
      getUnreadNotificationCount(),
      getUnreadMessageCount(),
    ]);
    setNotificationCount(notifications.status === "fulfilled" ? notifications.value : 0);
    setMessageCount(messages.status === "fulfilled" ? messages.value.count : 0);
  }, []);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts, location.pathname]);

  useEffect(() => {
    const refresh = () => loadUnreadCounts();
    window.addEventListener("focus", refresh);
    window.addEventListener(UNREAD_COUNTS_CHANGED, refresh);
    const intervalId = window.setInterval(loadUnreadCounts, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(UNREAD_COUNTS_CHANGED, refresh);
      window.clearInterval(intervalId);
    };
  }, [loadUnreadCounts]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;
    setMobileOpen(false);
    navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
  };

  const handleLogout = () => {
    logout();
    toast.success("logged out successfully");
    navigate("/", { replace: true });
  };

  const badgeFor = (count) => {
    if (!count) return null;
    const value = count === "messages" ? messageCount : notificationCount;
    return value > 0 ? (value > 99 ? "99+" : value) : null;
  };

  const renderLink = ({ to, label, icon: Icon, count }, mobile = false) => {
    const active = isActive(location.pathname, to);
    const badge = badgeFor(count);
    return (
      <Link
        key={to}
        to={to}
        onClick={() => {
          setMobileOpen(false);
        }}
        className={
          mobile
            ? `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${active ? "bg-sky text-brand" : "text-ink hover:bg-sky"}`
            : `group relative flex h-full min-w-[76px] flex-col items-center justify-center gap-0.5 px-2 text-xs font-normal leading-4 transition ${active ? "text-ink" : "text-muted-ink hover:text-ink"}`
        }
        aria-current={active ? "page" : undefined}
      >
        <span className="relative">
          <Icon size={mobile ? 19 : 21} strokeWidth={active ? 2.2 : 1.9} />
          {badge && (
            <span className="absolute -right-2 -top-2 rounded-full bg-accent-red px-1.5 text-[9px] font-bold leading-4 text-white">
              {badge}
            </span>
          )}
        </span>
        <span>{translate(label, language)}</span>
        {!mobile && (
          <span className={`absolute inset-x-0 bottom-0 h-0.5 ${active ? "bg-ink" : "bg-transparent group-hover:bg-gray-300"}`} />
        )}
      </Link>
    );
  };

  return (
    <header className="careerlink-header sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3 sm:px-5">
        <Link to="/feed" className="shrink-0 text-lg font-bold tracking-tight text-brand"         aria-label={translate("CareerLink home", language)}>
          Career<span className="text-ink">Link</span>
        </Link>

        <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1 xl:max-w-[350px]">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={translate("Search", language)}
            aria-label={translate("Search CareerLink", language)}
            className="careerlink-header-search h-9 w-full rounded-full border border-gray-300 bg-white py-2 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted-ink focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </form>

        <nav className="ml-auto hidden h-full items-center gap-0 xl:flex" aria-label={translate("Primary navigation", language)}>
          {primaryItems.map((item) => renderLink(item))}
          <MeDropdown />
          <span aria-hidden="true" className="mx-2 h-10 border-l border-gray-200" />
          <BusinessDropdown />
          <Link
            to="/network"
            className="flex h-full min-w-[76px] flex-col items-center justify-center gap-0.5 px-2 text-xs font-normal leading-4 text-muted-ink transition hover:text-ink"
            aria-label="Hire talent"
          >
            <BriefcaseBusiness size={21} strokeWidth={1.9} />
            <span>{translate("Hire", language)}</span>
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={translate(mobileOpen ? "Close menu" : "Open menu", language)}
          className="rounded-md p-2 text-muted-ink hover:bg-sky hover:text-ink xl:hidden"
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="careerlink-header-menu border-t border-gray-100 bg-white px-3 pb-3 pt-2 shadow-md xl:hidden">
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-sky p-3">
            <ProfileAvatar user={user} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <Link to={`/profile/${user?._id}`} onClick={() => setMobileOpen(false)} className="text-xs font-semibold text-brand hover:underline">{translate("View profile", language)}</Link>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-1" aria-label="Mobile navigation">
            {primaryItems.map((item) => renderLink(item, true))}
          </nav>
          <Link
            to="/network"
            onClick={() => setMobileOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-sky"
          >
            <BriefcaseBusiness size={19} /> {translate("Hire talent", language)}
          </Link>
          <BusinessDropdown onNavigate={() => setMobileOpen(false)} />
          <button type="button" onClick={handleLogout} className="mt-2 w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-accent-red hover:bg-red-50">
            {translate("Sign out", language)}
          </button>
        </div>
      )}
    </header>
  );
}
