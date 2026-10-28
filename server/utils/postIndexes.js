import Post from "../models/Post.js";

const repostIndexKey = { author: 1, repostOf: 1 };
const repostIndexOptions = {
  name: "author_1_repostOf_1",
  unique: true,
  partialFilterExpression: { repostOf: { $type: "objectId" } },
};

export const ensurePostIndexes = async () => {
  const indexes = await Post.collection.indexes();
  const existingIndex = indexes.find((index) =>
    JSON.stringify(index.key) === JSON.stringify(repostIndexKey),
  );
  const hasCorrectPartialFilter = JSON.stringify(existingIndex?.partialFilterExpression)
    === JSON.stringify(repostIndexOptions.partialFilterExpression);

  if (existingIndex?.unique && !existingIndex.sparse && hasCorrectPartialFilter) return;
  if (existingIndex) await Post.collection.dropIndex(existingIndex.name);
  await Post.collection.createIndex(repostIndexKey, repostIndexOptions);
};
