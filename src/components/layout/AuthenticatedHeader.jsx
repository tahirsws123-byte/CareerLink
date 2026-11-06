import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Home,
  Menu,
  MessageSquare,
  Search,
  ShieldAlert,
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
import api from "../../services/api.js";

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [isModerator, setIsModerator] = useState(false);

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
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    api.get("/moderation/access")
      .then(({ data }) => { if (active) setIsModerator(Boolean(data.isModerator)); })
      .catch(() => { if (active) setIsModerator(false); });
    return () => { active = false; };
  }, [user?._id]);

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
    setMobileSearchOpen(false);
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
            ? `flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${active ? "border-brand/20 bg-sky text-brand" : "border-transparent text-ink hover:bg-sky"}`
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
        <Link to="/feed" className="shrink-0 text-lg font-bold tracking-tight text-brand" aria-label={translate("CareerLink home", language)}>
          Career<span className="text-ink">Link</span>
        </Link>

        <form onSubmit={handleSearchSubmit} className="relative hidden min-w-0 flex-1 xl:block xl:max-w-[350px]">
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

        <div className="ml-auto flex items-center gap-1 xl:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((open) => !open);
              setMobileOpen(false);
            }}
            aria-expanded={mobileSearchOpen}
            aria-label={translate(mobileSearchOpen ? "Close search" : "Open search", language)}
            className={`grid h-10 w-10 place-items-center rounded-full transition ${mobileSearchOpen ? "bg-sky text-brand" : "text-muted-ink hover:bg-sky hover:text-ink"}`}
          >
            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen((open) => !open);
              setMobileSearchOpen(false);
            }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={translate(mobileOpen ? "Close menu" : "Open menu", language)}
            className={`grid h-10 w-10 place-items-center rounded-full transition ${mobileOpen ? "bg-sky text-brand" : "text-muted-ink hover:bg-sky hover:text-ink"}`}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="careerlink-header-menu border-t border-gray-100 px-4 py-3 xl:hidden"
        >
          <div className="relative mx-auto max-w-[680px]">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-ink" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={translate("Search", language)}
              aria-label={translate("Search CareerLink", language)}
              className="careerlink-header-search h-11 w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted-ink focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </form>
      )}

      {mobileOpen && (
        <div id="mobile-navigation" className="careerlink-header-menu max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-b-2xl border-t border-gray-100 bg-white px-3 pb-4 pt-3 shadow-xl xl:hidden">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-brand/10 bg-gradient-to-br from-sky to-background p-3.5">
            <ProfileAvatar user={user} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-ink">{user?.headline || user?.email}</p>
            </div>
            <Link to={`/profile/${user?._id}`} onClick={() => setMobileOpen(false)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-brand shadow-sm ring-1 ring-black/5">{translate("View profile", language)}</Link>
          </div>
          <nav className="grid grid-cols-2 gap-1.5" aria-label="Mobile navigation">
            {primaryItems.map((item) => renderLink(item, true))}
          </nav>
          <Link
            to="/network"
            onClick={() => setMobileOpen(false)}
            className="mt-1.5 flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-sky"
          >
            <BriefcaseBusiness size={19} /> {translate("Hire talent", language)}
          </Link>
          <div className="my-2 border-t border-gray-100 pt-2">
            <MeDropdown mobile onNavigate={() => setMobileOpen(false)} />
          </div>
          {isModerator && <Link to="/moderation/reports" onClick={() => setMobileOpen(false)} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-sky"><ShieldAlert size={19} />Moderation reports</Link>}
          <div className="mt-1 border-t border-gray-100 pt-2">
            <BusinessDropdown mobile onNavigate={() => setMobileOpen(false)} />
          </div>
          <button type="button" onClick={handleLogout} className="mt-2 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-accent-red transition hover:bg-red-50">
            {translate("Sign out", language)}
          </button>
        </div>
      )}
    </header>
  );
}
