import api from "../services/api.js";

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data.user;
};

export const uploadProfileImage = async (file) => {
  const formData = new FormData();

  formData.append("image", file);

  const { data } = await api.post(
    "/users/profile-image",
    formData
  );

  return data;
};

export const removeProfileImage = async () => {
  const { data } = await api.delete("/users/profile-image");

  return data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put("/users/profile", profileData);

  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get("/users/profile");
  return {
    ...response.data.user,
    notificationCapabilities: response.data.notificationCapabilities,
  };
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await api.put("/users/notification-preferences", preferences);
  return response.data;
};

export const changePassword = async (passwordData) => {
  const response = await api.put("/users/password", passwordData);
  return response.data;
};

export const getSecuritySettings = async () => {
  const response = await api.get("/users/security");
  return response.data;
};

export const requestSecurityCode = async (action, value = "") => {
  const response = await api.post("/users/security/code", { action, value });
  return response.data;
};

export const confirmSecurityAction = async (action, value, code) => {
  const response = await api.post("/users/security/confirm", { action, value, code });
  return response.data;
};

export const blockMember = async (userId) => {
  const response = await api.post(`/users/block/${userId}`);
  return response.data;
};

export const unblockMember = async (userId) => {
  const response = await api.delete(`/users/block/${userId}`);
  return response.data;
};

export const getBlockedMembers = async () => {
  const response = await api.get("/users/blocked");
  return response.data.users;
};

export const toggleFollowUser = async (userId) => {
  const response = await api.post(`/users/follow/${userId}`);
  return response.data;
};

export const deleteEducation = async (educationId) => {
  const response = await api.delete(`/users/education/${educationId}`);

  return response.data;
};

export const uploadCoverImage = async (file) => {
  const formData = new FormData();

  formData.append("image", file);

  const response = await api.post("/users/cover-image", formData);

  return response.data;
};

export const removeCoverImage = async () => {
  const response = await api.delete("/users/cover-image");

  return response.data;
};

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);
  const { data } = await api.post("/users/resumes", formData);
  return data;
};

export const deleteResume = async (resumeId) => {
  const { data } = await api.delete(`/users/resumes/${resumeId}`);
  return data;
};

export const getResumeDownloadUrl = async (resumeId) => {
  const { data } = await api.get(`/users/resumes/${resumeId}/download`);
  return data.url;
};

export const deactivateAccount = async () => {
  const { data } = await api.post("/users/deactivate", { confirmation: "DEACTIVATE" });
  return data;
};

export const deleteAccount = async (confirmation) => {
  const { data } = await api.delete("/users/account", { data: confirmation });
  return data;
};