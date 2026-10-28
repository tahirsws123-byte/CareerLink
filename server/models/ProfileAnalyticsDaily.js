import mongoose from "mongoose";

const profileAnalyticsDailySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: Date, required: true },
    postImpressions: { type: Number, default: 0, min: 0 },
    profileViews: { type: Number, default: 0, min: 0 },
    searchAppearances: { type: Number, default: 0, min: 0 },
    newFollowers: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

profileAnalyticsDailySchema.index({ user: 1, day: 1 }, { unique: true });

export default mongoose.model("ProfileAnalyticsDaily", profileAnalyticsDailySchema);
