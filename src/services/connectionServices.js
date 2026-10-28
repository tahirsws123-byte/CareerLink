import api from "./api";

export const getConnectionSummary = async () => {
  const { data } = await api.get("/connections/summary");
  return data;
};

export const getConnectionCount = async () => {
  const { data } = await api.get("/connections/count");
  return data.count;
};

export const getConnectionStatus = async (userId) => {
  const { data } = await api.get(`/connections/status/${userId}`);
  return data;
};

export const sendConnectionRequest = async (userId) => {
  const { data } = await api.post(`/connections/${userId}/request`);
  return data;
};

export const cancelConnectionRequest = async (connectionId) => {
  const { data } = await api.delete(`/connections/${connectionId}/cancel`);
  return data;
};

export const acceptConnectionRequest = async (connectionId) => {
  const { data } = await api.patch(`/connections/${connectionId}/accept`);
  return data;
};

export const rejectConnectionRequest = async (connectionId) => {
  const { data } = await api.patch(`/connections/${connectionId}/reject`);
  return data;
};

export const removeConnection = async (connectionId) => {
  const { data } = await api.delete(`/connections/${connectionId}`);
  return data;
};
