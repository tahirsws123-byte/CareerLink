import CompanyPage from "../models/CompanyPage.js";

const publicUrlSlugIndexKey = { publicUrlSlug: 1 };
const publicUrlSlugIndexOptions = {
  name: "publicUrlSlug_1",
  unique: true,
};

export const ensureCompanyPageIndexes = async () => {
  await CompanyPage.collection.createIndex(publicUrlSlugIndexKey, publicUrlSlugIndexOptions);
};
