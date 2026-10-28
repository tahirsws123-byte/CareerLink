import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellOff,
  CheckCircle2,
  Ellipsis,
  MessageSquare,
  SlidersHorizontal,
  Settings,
  ThumbsUp,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card";
import ProfileCard from "../components/feed/ProfileCard";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import ExperienceModal from "../components/profile/ExperienceModal";
import useAuth from "../hooks/useAuth";
import { getMyProfile } from "../services/userServices";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  muteNotificationSender,
  showLessLikeThis,
} from "../services/notificationServices";
import { emitUnreadCountsChanged } from "../utils/unreadEvents";
import useTranslation from "../hooks/useTranslation";

const getNotificationIcon = (type) => {
  if (type === "post_like") return ThumbsUp;
  if (type === "post_comment") return MessageSquare;
  if (type === "connection_request") return UserPlus;
  if (type === "connection_accepted") return CheckCircle2;
  if (type === "message") return MessageSquare;
  if (type === "inmail_message" || type === "inmail_reminder" || type === "unread_message_reminder") return MessageSquare;
  return Bell;
};

const getNotificationLink = (notification) => {
  if (notification.type?.startsWith("event_") && notification.event?._id) return `/events/${notification.event._id}`;
  if (notification.type === "profile_recommendation") return "/settings#account-preferences";
  if (["group_post", "group_invitation", "group_recommendation"].includes(notification.type) && notification.group?._id) return `/groups/${notification.group._id}`;
  if (notification.type === "connection_request") return "/network";
  if (notification.type === "connection_accepted") return "/network";
  if (notification.type === "new_follower") return notification.newsletter ? "/newsletters" : "/network";
  if (notification.type === "profile_view") return "/dashboard/profile-views";
  if (notification.type === "search_appearance") return "/dashboard/profile-views";
  if (["followed_post", "suggested_post", "trending_conversation"].includes(notification.type)) {
    return notification.post?._id ? `/feed?postId=${notification.post._id}` : "/feed";
  }
  if (["job_alert", "job_recommendation"].includes(notification.type)) {
    return notification.job?._id ? `/jobs/view/${notification.job._id}` : `/jobs?q=${encodeURIComponent(notification.job?.title || "")}`;
  }
  if (["connection_recommendation", "follow_recommendation", "birthday"].includes(notification.type)) return "/network";
  if (notification.type === "hiring_candidate_message" && notification.conversation) return `/messages/${notification.conversation}`;
  if (notification.type === "saved_job_update") return "/jobs/tracker";
  if (notification.type === "job_application") return "/jobs/applications";
  if (notification.type === "job_application_status") return "/jobs/tracker";
  if (notification.type === "job_invite") return `/jobs/view/${notification.job?._id || ""}`;
  if (notification.type === "mention") return "/feed";
  if (["message", "inmail_message", "inmail_reminder", "unread_message_reminder"].includes(notification.type) && notification.conversation) {
    return `/messages/${notification.conversation}`;
  }

  return "/feed";
};

const notificationTabs = ["All", "Jobs", "My posts", "Mentions"];

const matchesNotificationTab = (notification, tab) => {
  if (tab === "All") return true;
  if (tab === "Jobs") {
    return notification.type?.startsWith("job_")
      || notification.type === "hiring_candidate_message"
      || notification.category === "jobs";
  }
  if (tab === "My posts") {
    return ["post_like", "post_comment"].includes(notification.type);
  }

  return (
    notification.type === "mention" ||
    notification.isMentioned ||
    /@\S+/.test(notification.comment?.text || notification.post?.text || "")
  );
};

export default function Notifications() {
  const { updateUser } = useAuth();
  const t = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [experienceLoading, setExperienceLoading] = useState(true);
  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [workingNotificationId, setWorkingNotificationId] = useState(null);
  const [selectedTab, setSelectedTab] = useState("All");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      setError(error.response?.data?.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (isMounted) setExperiences(profile.experience || []);
      })
      .catch((error) => {
        if (isMounted) {
          toast.error(error.response?.data?.message || "Unable to load your experience");
        }
      })
      .finally(() => {
        if (isMounted) setExperienceLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkRead = async (notificationId) => {
    try {
      const updatedNotification = await markNotificationRead(notificationId);
      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? updatedNotification
            : notification,
        ),
      );
      emitUnreadCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    if (working) return;

    try {
      setWorking(true);
      await markAllNotificationsRead();
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
      emitUnreadCountsChanged();
      toast.success("Notifications marked as read");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update notifications");
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      setWorkingNotificationId(notificationId);
      await deleteNotification(notificationId);
      setNotifications((previous) =>
        previous.filter((notification) => notification._id !== notificationId),
      );
      emitUnreadCountsChanged();
      setOpenMenuId(null);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete notification");
    } finally {
      setWorkingNotificationId(null);
    }
  };

  const handleShowLess = async (notification) => {
    try {
      setWorkingNotificationId(notification._id);
      await showLessLikeThis(notification._id);
      setNotifications((previous) =>
        previous.filter((item) => item.type !== notification.type),
      );
      emitUnreadCountsChanged();
      setOpenMenuId(null);
      toast.success("You’ll see fewer notifications like this");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update notification preferences");
    } finally {
      setWorkingNotificationId(null);
    }
  };

  const handleMuteSender = async (notification) => {
    try {
      setWorkingNotificationId(notification._id);
      await muteNotificationSender(notification._id);
      const senderId = notification.sender?._id?.toString();
      setNotifications((previous) =>
        previous.filter((item) =>
          senderId
            ? item.sender?._id?.toString() !== senderId
            : item._id !== notification._id,
        ),
      );
      emitUnreadCountsChanged();
      setOpenMenuId(null);
      toast.success("You won’t receive notifications from this account");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update notification preferences");
    } finally {
      setWorkingNotificationId(null);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read)
    .length;
  const visibleNotifications = notifications.filter((notification) =>
    matchesNotificationTab(notification, selectedTab),
  );

  return (
    <div className="h-[calc(100dvh-56px)] overflow-hidden bg-[#f3f2ef]">
      <div className="mx-auto grid h-full max-w-[1128px] grid-rows-[auto_minmax(0,1fr)] grid-cols-1 gap-4 px-4 py-4 sm:grid-rows-1 sm:grid-cols-12 sm:gap-6">
        <aside className="space-y-4 sm:col-span-4 sm:min-h-0 lg:col-span-3">
          <ProfileCard
            variant="notifications"
            onExperienceClick={() => setExperienceModalOpen(true)}
            experienceDisabled={experienceLoading}
          />
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky text-brand">
                <Settings size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink">{t("Manage your notifications")}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-ink">
                  {t("Choose the updates you want to receive.")}
                </p>
                <Link
                  to="/settings#notifications"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  {t("View settings")} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </Card>
        </aside>

        <section className="min-h-0 min-w-0 sm:col-span-8 lg:col-span-9">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-ink">{t("Notifications")}</h1>
              <p className="mt-1 text-sm text-muted-ink">
                {unreadCount} {t(unreadCount === 1 ? "unread update" : "unread updates")}.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={working || unreadCount === 0}
              className="inline-flex items-center justify-center rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Mark all as read")}
            </button>
          </div>

          <nav
            aria-label="Notification categories"
            className="shrink-0 flex gap-2 overflow-x-auto border-b border-gray-200 px-4 py-3"
          >
            {notificationTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedTab(tab)}
                aria-pressed={selectedTab === tab}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedTab === tab
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t(tab)}
              </button>
            ))}
          </nav>

          {loading && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 text-sm text-muted-ink">
              {t("Loading notifications...")}
            </div>
          )}

          {!loading && error && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && visibleNotifications.length === 0 && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 text-sm text-muted-ink">
              {notifications.length === 0
                ? t("You have no notifications yet.")
                : `${t("You have no")} ${selectedTab === "All" ? "" : `${t(selectedTab).toLowerCase()} `}${t("notifications")}.`}
            </div>
          )}

          {!loading && !error && visibleNotifications.length > 0 && (
            <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
              {visibleNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);

                return (
                  <div
                    key={notification._id}
                    className={`relative flex min-w-0 gap-3 px-4 py-4 ${
                      notification.read ? "bg-white" : "bg-sky"
                    }`}
                  >
                    <div className="shrink-0">
                      <ProfileAvatar user={notification.sender} size={48} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={getNotificationLink(notification)}
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkRead(notification._id);
                          }
                        }}
                        className="block text-sm text-ink hover:underline"
                      >
                        {notification.text}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-ink">
                        <Icon size={14} />
                        <span>
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification._id)}
                        className="h-3 w-3 shrink-0 self-center rounded-full bg-brand"
                        aria-label={t("Mark notification as read")}
                      />
                    )}

                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((current) =>
                            current === notification._id ? null : notification._id,
                          )
                        }
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100 hover:text-ink"
                        aria-label={t("Notification options")}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === notification._id}
                      >
                        <Ellipsis size={19} />
                      </button>
                      {openMenuId === notification._id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-9 z-30 w-[292px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.18)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={workingNotificationId === notification._id}
                            onClick={() => handleDeleteNotification(notification._id)}
                            className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-sky disabled:opacity-50"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-muted-ink">
                              <Trash2 size={16} />
                            </span>
                            {t("Delete notification")}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={workingNotificationId === notification._id}
                            onClick={() => handleShowLess(notification)}
                            className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-sky disabled:opacity-50"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-muted-ink">
                              <SlidersHorizontal size={16} />
                            </span>
                            {t("Show less like this")}
                          </button>
                          {notification.sender && (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={workingNotificationId === notification._id}
                              onClick={() => handleMuteSender(notification)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-sky disabled:opacity-50"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-muted-ink">
                                <BellOff size={16} />
                              </span>
                              {t("Don’t receive notifications from this account")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </section>
      </div>
      <ExperienceModal
        open={experienceModalOpen}
        onClose={() => setExperienceModalOpen(false)}
        onSaved={(updatedExperiences) => {
          setExperiences(updatedExperiences);
          updateUser({ experience: updatedExperiences });
          setExperienceModalOpen(false);
          toast.success("Experience saved");
        }}
        experiences={experiences}
      />
    </div>
  );
}
