import mongoose from "mongoose";

export const COMPANY_PAGE_SIZES = [
  "0–1 employees",
  "2–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "501–1,000 employees",
  "1,001–5,000 employees",
  "5,001–10,000 employees",
  "10,000+ employees",
];

export const COMPANY_PAGE_TYPES = [
  "Public company",
  "Self-employed",
  "Government agency",
  "Nonprofit",
  "Sole proprietorship",
  "Privately held",
  "Partnership",
];

const companyPageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    publicUrlSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    website: { type: String, trim: true, maxlength: 300, default: "" },
    industry: { type: String, required: true, trim: true, maxlength: 100 },
    companySize: { type: String, required: true, enum: COMPANY_PAGE_SIZES },
    companyType: { type: String, required: true, enum: COMPANY_PAGE_TYPES },
    overview: { type: String, trim: true, maxlength: 2000, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    yearFounded: { type: Number, min: 1800, max: 3000, default: null },
    specialties: { type: [String], default: [] },
    logo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    banner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    tagline: { type: String, trim: true, maxlength: 120, default: "" },
    messagingEnabled: { type: Boolean, default: true },
    conversationTopics: {
      type: [{ type: String, enum: ["Service request", "Request a demo", "Support", "Careers", "Other"] }],
      default: ["Service request", "Request a demo", "Support", "Careers", "Other"],
    },
    followedPages: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyPage" }],
    blockedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedPages: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyPage" }],
    jobPostingDomains: [{ type: String, trim: true, lowercase: true, maxlength: 253 }],
    basicJobPostingEnabled: { type: Boolean, default: false },
    shareNewJobs: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date, default: null },
    customButton: {
      enabled: { type: Boolean, default: false },
      label: {
        type: String,
        enum: ["Contact us", "Request demo", "Learn more", "Register", "Sign up", "Visit website", "Visit portfolio", "Visit store"],
        default: "Visit website",
      },
      url: { type: String, trim: true, maxlength: 300, default: "" },
    },
    workplace: {
      enabled: { type: Boolean, default: false },
      policy: { type: String, enum: ["On-site", "Hybrid", "Remote", ""], default: "" },
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["content_admin", "analyst"], required: true },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      addedAt: { type: Date, default: Date.now },
    }],
    followers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      followedAt: { type: Date, default: Date.now },
    }],
    competitors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyPage",
    }],
    pageVisits: { type: Number, default: 0, min: 0 },
    searchAppearances: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

companyPageSchema.index({ publicUrlSlug: 1 }, { unique: true });
companyPageSchema.index({ owner: 1, createdAt: -1 });
companyPageSchema.index({ "admins.user": 1 });
companyPageSchema.index({ "followers.user": 1 });
companyPageSchema.index({ followedPages: 1 });

export default mongoose.model("CompanyPage", companyPageSchema);
