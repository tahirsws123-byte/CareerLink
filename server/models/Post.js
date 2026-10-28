import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    groupPostStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },

    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    video: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    poll: {
      question: { type: String, trim: true, maxlength: 140, default: "" },
      options: [{
        text: { type: String, trim: true, maxlength: 30, required: true },
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      }],
      expiresAt: { type: Date, default: null },
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
          enum: ["👍", "❤️", "😂", "😮", "😢", "👏"],
        },
      },
    ],

    repostOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    repostedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },
    commentsDisabled: {
      type: Boolean,
      default: false,
    },

    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index(
  { author: 1, repostOf: 1 },
  {
    unique: true,
    partialFilterExpression: { repostOf: { $type: "objectId" } },
  },
);

const Post = mongoose.model("Post", postSchema);

export default Post;
