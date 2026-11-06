import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 160, default: "" },
    company: { type: String, trim: true, maxlength: 160, default: "" },
    companyPage: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyPage", default: null, index: true },
    location: { type: String, trim: true, maxlength: 160, default: "" },
    type: { type: String, trim: true, maxlength: 60, default: "" },
    level: { type: String, trim: true, maxlength: 60, default: "" },
    workMode: { type: String, trim: true, maxlength: 30, default: "On-site" },
    industry: { type: String, trim: true, maxlength: 100, default: "" },
    jobFunction: { type: String, trim: true, maxlength: 100, default: "" },
    commitments: { type: [String], default: [] },
    easyApply: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    applicantCount: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["open", "draft", "in-review", "paused", "closed"], default: "open", index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    salary: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, trim: true, maxlength: 3000, default: "" },
    tags: { type: [String], default: [] },
    postedAt: { type: Date, default: Date.now },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

jobSchema.index({ title: "text", company: "text", description: "text", tags: "text" });
jobSchema.index({ type: 1, location: 1, postedAt: -1 });

export default mongoose.model("Job", jobSchema);
