import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    resume: { type: String, trim: true, maxlength: 500, default: "" },
    resumeRef: { type: mongoose.Schema.Types.ObjectId, default: null },
    resumeName: { type: String, trim: true, maxlength: 180, default: "" },
    coverLetter: { type: String, trim: true, maxlength: 5000, default: "" },
    status: {
      type: String,
      enum: ["applied", "reviewing", "interview", "offer", "rejected", "withdrawn"],
      default: "applied",
    },
  },
  { timestamps: true },
);

jobApplicationSchema.index({ applicant: 1, createdAt: -1 });
jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default mongoose.model("JobApplication", jobApplicationSchema);
