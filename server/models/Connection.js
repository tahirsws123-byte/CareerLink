import mongoose from "mongoose";

export const CONNECTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

export const makeConnectionPairKey = (firstUserId, secondUserId) =>
  [firstUserId.toString(), secondUserId.toString()].sort().join(":");

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pairKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(CONNECTION_STATUS),
      default: CONNECTION_STATUS.PENDING,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

connectionSchema.index({ requester: 1, status: 1, updatedAt: -1 });
connectionSchema.index({ recipient: 1, status: 1, updatedAt: -1 });
connectionSchema.index({ status: 1, updatedAt: -1 });

connectionSchema.pre("validate", function setPairKey() {
  if (this.requester && this.recipient) {
    if (this.requester.toString() === this.recipient.toString()) {
      this.invalidate("recipient", "Users cannot connect to themselves");
    }

    this.pairKey = makeConnectionPairKey(this.requester, this.recipient);
  }
});

const Connection = mongoose.model("Connection", connectionSchema);

export default Connection;
