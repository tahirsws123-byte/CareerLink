import api from "./api";

export const getNotifications = async () => {
  const { data } = await api.get("/notifications");
  return data.notifications;
};

export const getUnreadNotificationCount = async () => {
  const { data } = await api.get("/notifications/unread-count");
  return data.count;
};

export const markNotificationRead = async (notificationId) => {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data.notification;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch("/notifications/read-all");
  return data;
};

export const deleteNotification = async (notificationId) => {
  const { data } = await api.delete(`/notifications/${notificationId}`);
  return data;
};

export const showLessLikeThis = async (notificationId) => {
  const { data } = await api.post(`/notifications/${notificationId}/show-less`);
  return data;
};

export const muteNotificationSender = async (notificationId) => {
  const { data } = await api.post(`/notifications/${notificationId}/mute-sender`);
  return data;
};
