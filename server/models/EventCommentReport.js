import mongoose from "mongoose";

const eventCommentReportSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    comment: { type: mongoose.Schema.Types.ObjectId, required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: ["spam", "harassment", "misinformation", "inappropriate", "other"], required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
  },
  { timestamps: true },
);

eventCommentReportSchema.index({ event: 1, comment: 1, reporter: 1 }, { unique: true });
eventCommentReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("EventCommentReport", eventCommentReportSchema);
