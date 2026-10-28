import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema(
  {
    profile: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    firstViewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

profileViewSchema.index({ profile: 1, viewer: 1 }, { unique: true });
profileViewSchema.index({ profile: 1, lastViewedAt: -1 });

export default mongoose.model("ProfileView", profileViewSchema);
