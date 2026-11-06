const configuredModeratorIds = () => new Set(
  (process.env.CAREERLINK_MODERATOR_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export const isPlatformModerator = (userId) =>
  Boolean(userId && configuredModeratorIds().has(userId.toString()));

export const requirePlatformModerator = (req, res, next) => {
  if (!req.user?._id) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isPlatformModerator(req.user._id)) {
    return res.status(403).json({ message: "Moderator access required" });
  }
  return next();
};
