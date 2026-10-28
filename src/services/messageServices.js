import api from "./api";

export const getConversations = async () => {
  const { data } = await api.get("/messages/conversations");
  return data.conversations;
};

export const getUnreadMessageCount = async () => {
  const { data } = await api.get("/messages/unread-count");
  return data;
};

export const createOrGetConversation = async (participantId) => {
  const { data } = await api.post("/messages/conversations", {
    participantId,
  });

  return data.conversation;
};

export const toggleConversationStar = async (conversationId) => {
  const { data } = await api.post(`/messages/conversations/${conversationId}/star`);
  return data.starred;
};

export const getMessages = async (conversationId) => {
  const { data } = await api.get(
    `/messages/conversations/${conversationId}/messages`,
  );

  return data.messages;
};

export const sendMessage = async (conversationId, text, postId = null, attachment = null, jobId = null) => {
  const payload = new FormData();
  payload.append("text", text || "");
  if (postId) payload.append("postId", postId);
  if (jobId) payload.append("jobId", jobId);
  if (attachment) payload.append("attachment", attachment);
  const { data } = await api.post(`/messages/conversations/${conversationId}/messages`, payload);

  return data.message;
};

export const updateConversationAction = async (conversationId, action, value) => {
  const { data } = await api.post(`/messages/conversations/${conversationId}/action`, {
    action,
    value,
  });
  return data;
};

export const updateMessageAction = async (conversationId, messageId, payload) => {
  const { data } = await api.post(
    `/messages/conversations/${conversationId}/messages/${messageId}/action`,
    payload,
  );
  return data;
};
