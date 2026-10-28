import mongoose from "mongoose";

const jobAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    workMode: { type: String, enum: ["", "On-site", "Hybrid", "Remote"], default: "" },
    type: { type: String, trim: true, maxlength: 60, default: "" },
    level: { type: String, trim: true, maxlength: 60, default: "" },
    frequency: { type: String, enum: ["Daily", "Weekly"], default: "Daily" },
    active: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobAlertSchema.index({ active: 1, updatedAt: -1 });

export default mongoose.model("JobAlert", jobAlertSchema);
