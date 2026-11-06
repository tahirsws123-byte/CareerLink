export const sumPostReactions = (posts) =>
  posts.reduce((total, post) => total + Number(post.reactionsCount || 0), 0);
