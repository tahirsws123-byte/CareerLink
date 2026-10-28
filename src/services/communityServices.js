import api from "./api.js";

export const getGroups = (search = "") =>
  api.get("/community/groups", { params: search ? { search } : {} }).then(({ data }) => data.groups || []);
export const createGroup = (payload) => {
  const form = new FormData();
  ["name", "description", "category", "location", "rules", "privacy"].forEach((key) => form.append(key, payload[key] || ""));
  if (payload.showInSearch !== undefined) form.append("showInSearch", String(payload.showInSearch));
  if (payload.image instanceof File) form.append("image", payload.image);
  if (payload.coverImage instanceof File) form.append("coverImage", payload.coverImage);
  return api.post("/community/groups", form).then(({ data }) => data.group);
};
export const toggleGroupMembership = (id) => api.post(`/community/groups/${id}/join`).then(({ data }) => data);
export const getGroup = (id) => api.get(`/community/groups/${id}`).then(({ data }) => ({
  ...data.group,
  currentUserId: data.currentUserId?.toString(),
}));
export const getGroupManagement = (id, days = 14) =>
  api.get(`/community/groups/${id}/manage`, { params: { days } }).then(({ data }) => data);
export const getGroupPostAnalytics = (groupId, postId) =>
  api.get(`/community/groups/${groupId}/posts/${postId}/analytics`).then(({ data }) => data);
export const updateGroupManagement = (id, payload) =>
  api.patch(`/community/groups/${id}/manage`, payload).then(({ data }) => data);
export const updateGroup = (id, payload) => {
  const form = new FormData();
  ["name", "description", "category", "location", "rules", "privacy", "allowMemberInvites", "requirePostApproval", "showInSearch"].forEach((key) => {
    if (payload[key] !== undefined) form.append(key, String(payload[key] ?? ""));
  });
  if (payload.image instanceof File) form.append("image", payload.image);
  if (payload.coverImage instanceof File) form.append("coverImage", payload.coverImage);
  return api.put(`/community/groups/${id}`, form).then(({ data }) => data.group);
};
export const reviewGroupJoinRequest = (groupId, userId, action) =>
  api.post(`/community/groups/${groupId}/requests/${userId}`, { action }).then(({ data }) => data);
export const toggleGroupPostPin = (groupId, postId) =>
  api.post(`/community/groups/${groupId}/posts/${postId}/pin`).then(({ data }) => data);
export const reviewGroupPost = (groupId, postId, action) =>
  api.post(`/community/groups/${groupId}/posts/${postId}/review`, { action }).then(({ data }) => data);
export const toggleGroupNotifications = (groupId) =>
  api.post(`/community/groups/${groupId}/notifications`).then(({ data }) => data);

export const getEvents = (search = "") =>
  api.get("/community/events", { params: search ? { search } : {} }).then(({ data }) => data.events || []);
export const createEvent = (payload) => {
  const form = new FormData();
  ["title", "description", "startsAt", "endsAt", "timezone", "eventType", "location", "externalLink"].forEach((key) => {
    if (payload[key] !== undefined) form.append(key, payload[key] || "");
  });
  form.append("speakers", JSON.stringify(payload.speakers || []));
  if (payload.coverImage instanceof File) form.append("coverImage", payload.coverImage);
  return api.post("/community/events", form).then(({ data }) => data.event);
};
export const getEvent = (id) => api.get(`/community/events/${id}`).then(({ data }) => data);
export const getEventPostAnalytics = (id) => api.get(`/community/events/${id}/analytics/post`).then(({ data }) => data);
export const updateEvent = (id, payload) => {
  const form = new FormData();
  ["title", "description", "startsAt", "endsAt", "timezone", "eventType", "location", "externalLink"].forEach((key) => {
    if (payload[key] !== undefined) form.append(key, payload[key] ?? "");
  });
  if (payload.speakers !== undefined) form.append("speakers", JSON.stringify(payload.speakers));
  if (payload.coverImage instanceof File) form.append("coverImage", payload.coverImage);
  return api.patch(`/community/events/${id}`, form).then(({ data }) => data.event);
};
export const deleteEvent = (id) => api.delete(`/community/events/${id}`).then(({ data }) => data);
export const cancelEvent = (id) => api.post(`/community/events/${id}/cancel`).then(({ data }) => data.event);
export const updateEventAttendee = (eventId, userId, action) =>
  api.post(`/community/events/${eventId}/attendees/${userId}`, { action }).then(({ data }) => data);
export const addEventComment = (eventId, payload) => {
  const form = new FormData();
  form.append("text", payload.text || "");
  form.append("gifUrl", payload.gifUrl || "");
  if (payload.image instanceof File) form.append("image", payload.image);
  return api.post(`/community/events/${eventId}/comments`, form).then(({ data }) => data.comments);
};
export const updateEventComment = (eventId, commentId, text) =>
  api.patch(`/community/events/${eventId}/comments/${commentId}`, { text }).then(({ data }) => data.comments);
export const deleteEventComment = (eventId, commentId) =>
  api.delete(`/community/events/${eventId}/comments/${commentId}`).then(({ data }) => data.comments);
export const toggleEventCommentLike = (eventId, commentId) =>
  api.post(`/community/events/${eventId}/comments/${commentId}/like`).then(({ data }) => data.comments);
export const toggleEventCommentPin = (eventId, commentId) =>
  api.post(`/community/events/${eventId}/comments/${commentId}/pin`).then(({ data }) => data.comments);
export const reportEventComment = (eventId, commentId, payload) =>
  api.post(`/community/events/${eventId}/comments/${commentId}/report`, payload).then(({ data }) => data);
export const addEventCommentReply = (eventId, commentId, text) =>
  api.post(`/community/events/${eventId}/comments/${commentId}/replies`, { text }).then(({ data }) => data.comments);
export const updateEventCommentSettings = (eventId, commentsDisabled) =>
  api.patch(`/community/events/${eventId}/comment-settings`, { commentsDisabled }).then(({ data }) => data.commentsDisabled);
export const toggleEventRsvp = (id) => api.post(`/community/events/${id}/rsvp`).then(({ data }) => data);

export const getNewsletters = (search = "") =>
  api.get("/community/newsletters", { params: search ? { search } : {} }).then(({ data }) => data.newsletters || []);
export const createNewsletter = (payload) => api.post("/community/newsletters", payload).then(({ data }) => data.newsletter);
export const toggleNewsletterSubscription = (id) =>
  api.post(`/community/newsletters/${id}/subscribe`).then(({ data }) => data);
