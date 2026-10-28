import User from "../models/User.js";

const publicProfileSlugIndexKey = { publicProfileSlug: 1 };
const publicProfileSlugIndexOptions = {
  name: "publicProfileSlug_1",
  unique: true,
  partialFilterExpression: {
    publicProfileSlug: { $type: "string", $gt: "" },
  },
};

export const ensureUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const existingIndex = indexes.find((index) =>
    JSON.stringify(index.key) === JSON.stringify(publicProfileSlugIndexKey),
  );
  const hasCorrectPartialFilter = JSON.stringify(existingIndex?.partialFilterExpression)
    === JSON.stringify(publicProfileSlugIndexOptions.partialFilterExpression);

  if (existingIndex?.unique && hasCorrectPartialFilter) return;
  if (existingIndex) await User.collection.dropIndex(existingIndex.name);
  await User.collection.createIndex(publicProfileSlugIndexKey, publicProfileSlugIndexOptions);
};
