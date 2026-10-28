import mongoose from "mongoose";

const jobReportSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: ["misleading", "scam", "discrimination", "expired", "other"], required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
  },
  { timestamps: true },
);

jobReportSchema.index({ job: 1, reporter: 1 }, { unique: true });
jobReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("JobReport", jobReportSchema);
