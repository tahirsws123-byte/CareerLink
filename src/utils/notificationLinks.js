export const getNotificationLink = (notification) => {
  if (notification.type?.startsWith("event_") && notification.event?._id) return `/events/${notification.event._id}`;
  if (notification.type === "profile_recommendation") return "/settings#account-preferences";
  if (["group_post", "group_invitation", "group_recommendation"].includes(notification.type) && notification.group?._id) return `/groups/${notification.group._id}`;
  if (notification.type === "connection_request") return "/network";
  if (notification.type === "connection_accepted") return "/network";
  if (notification.type === "new_follower") return notification.newsletter ? "/newsletters" : "/network";
  if (notification.type === "profile_view") return "/dashboard/profile-views";
  if (notification.type === "search_appearance") return "/dashboard/search-appearances";
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
