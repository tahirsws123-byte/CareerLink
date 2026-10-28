import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 75 },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    timezone: { type: String, trim: true, maxlength: 80, default: "UTC" },
    coverImage: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    eventType: { type: String, enum: ["online", "in-person"], default: "online" },
    location: { type: String, trim: true, maxlength: 200, default: "" },
    isOnline: { type: Boolean, default: false },
    meetingUrl: { type: String, trim: true, maxlength: 1024, default: "" },
    externalLink: { type: String, trim: true, maxlength: 1024, default: "" },
    cancelledAt: { type: Date, default: null },
    speakers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    invitedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, trim: true, maxlength: 1000, default: "" },
      image: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
      gifUrl: { type: String, trim: true, maxlength: 1024, default: "" },
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      replies: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, trim: true, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      }],
      pinned: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],
    commentsDisabled: { type: Boolean, default: false },
    pageVisits: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

eventSchema.index({ startsAt: 1 });
eventSchema.index({ title: "text", description: "text", location: "text" });

export default mongoose.model("Event", eventSchema);
