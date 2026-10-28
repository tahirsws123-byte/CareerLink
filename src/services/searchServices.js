import api from "./api";

export const searchUsers = async (query) => {
  const { data } = await api.get("/users/search", {
    params: {
      q: query,
    },
  });

  return data.users;
};
