import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, trim: true, maxlength: 80, default: "Career" },
    frequency: { type: String, enum: ["weekly", "monthly", "occasional"], default: "weekly" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

newsletterSchema.index({ name: "text", description: "text", category: "text" });

export default mongoose.model("Newsletter", newsletterSchema);
