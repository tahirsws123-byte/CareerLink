import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, trim: true, maxlength: 80, default: "Professional" },
    location: { type: String, trim: true, maxlength: 200, default: "" },
    rules: { type: String, trim: true, maxlength: 2000, default: "" },
    privacy: { type: String, enum: ["public", "private"], default: "public" },
    showInSearch: { type: Boolean, default: true },
    allowMemberInvites: { type: Boolean, default: true },
    requirePostApproval: { type: Boolean, default: false },
    contentReviewMode: { type: String, enum: ["all", "criteria", "none"], default: "none" },
    contentReviewCriteria: {
      images: { type: Boolean, default: false },
      videos: { type: Boolean, default: false },
      links: { type: Boolean, default: false },
    },
    image: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    coverImage: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    membershipEvents: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      action: { type: String, enum: ["joined", "left"], required: true },
      date: { type: Date, default: Date.now },
    }],
    requestedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    invitedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    welcomeNote: { type: String, trim: true, maxlength: 1000, default: "" },
    welcomeNoteEnabled: { type: Boolean, default: false },
    joinApprovalMode: { type: String, enum: ["open", "criteria", "approval"] },
    pinnedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    notificationMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

groupSchema.index({ name: "text", description: "text", category: "text" });
groupSchema.index({ createdAt: -1 });

export default mongoose.model("Group", groupSchema);
