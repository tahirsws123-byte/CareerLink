import api from "./api.js";

export const getMyCompanyPages = async () => {
  const { data } = await api.get("/company-pages/mine");
  return data.companyPages;
};
