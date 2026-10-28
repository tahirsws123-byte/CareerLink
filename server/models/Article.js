import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 20000,
    },

    excerpt: {
      type: String,
      default: "",
      trim: true,
      maxlength: 280,
    },

    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

articleSchema.index({ author: 1, createdAt: -1 });
articleSchema.index({ createdAt: -1 });

const Article = mongoose.model("Article", articleSchema);

export default Article;
