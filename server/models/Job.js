import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    company: { type: String, required: true, trim: true, maxlength: 160 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, required: true, trim: true, maxlength: 60 },
    level: { type: String, required: true, trim: true, maxlength: 60 },
    workMode: { type: String, trim: true, maxlength: 30, default: "On-site" },
    industry: { type: String, trim: true, maxlength: 100, default: "" },
    jobFunction: { type: String, trim: true, maxlength: 100, default: "" },
    commitments: { type: [String], default: [] },
    easyApply: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    applicantCount: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    salary: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    tags: { type: [String], default: [] },
    postedAt: { type: Date, default: Date.now },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

jobSchema.index({ title: "text", company: "text", description: "text", tags: "text" });
jobSchema.index({ type: 1, location: 1, postedAt: -1 });

export default mongoose.model("Job", jobSchema);
