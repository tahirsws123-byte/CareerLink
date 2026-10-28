import ProfileAnalyticsDaily from "../models/ProfileAnalyticsDaily.js";

export const recordProfileAnalytics = async (userIds, metric, amount = 1) => {
  if (!["postImpressions", "profileViews", "searchAppearances", "newFollowers"].includes(metric)) {
    throw new Error(`Unsupported profile analytics metric: ${metric}`);
  }

  const ids = [...new Set((userIds || []).filter(Boolean).map((id) => id.toString()))];
  if (!ids.length || !Number.isInteger(amount) || amount < 1) return;

  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await ProfileAnalyticsDaily.bulkWrite(ids.map((user) => ({
    updateOne: {
      filter: { user, day },
      update: { $inc: { [metric]: amount }, $setOnInsert: { user, day } },
      upsert: true,
    },
  })));
};
