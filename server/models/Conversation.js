import mongoose from "mongoose";

export const makeConversationPairKey = (participants) =>
  participants.map((id) => id.toString()).sort().join(":");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    pairKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["message", "inmail"],
      default: "message",
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    unreadBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    category: {
      type: String,
      enum: ["focused", "jobs", "other"],
      default: "focused",
    },

    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

conversationSchema.pre("validate", function setConversationPairKey() {
  const uniqueParticipants = [...new Set(this.participants.map(String))];

  if (uniqueParticipants.length !== 2) {
    this.invalidate(
      "participants",
      "A conversation must have exactly two distinct participants",
    );
  } else {
    this.pairKey = makeConversationPairKey(uniqueParticipants);
  }
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
