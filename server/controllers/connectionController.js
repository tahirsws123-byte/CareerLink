import mongoose from "mongoose";
import Connection, {
  CONNECTION_STATUS,
  makeConnectionPairKey,
} from "../models/Connection.js";
import Event from "../models/Event.js";
import Group from "../models/Group.js";
import Newsletter from "../models/Newsletter.js";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";
import User from "../models/User.js";
import {
  attachConnectionStatus,
  getConnectionStatusPayload,
  getOtherUserFromConnection,
  userSummaryFields,
} from "../services/connectionService.js";
import { createNotification } from "../utils/notificationUtils.js";

const populateConnection = (query) =>
  query
    .populate("requester", userSummaryFields)
    .populate("recipient", userSummaryFields);

const serializeConnection = (connection, currentUserId) => {
  const otherUser = getOtherUserFromConnection(connection, currentUserId);
  const payload = getConnectionStatusPayload(connection, currentUserId);

  return {
    _id: connection._id,
    status: connection.status,
    connectionStatus: payload.status,
    requester: connection.requester,
    recipient: connection.recipient,
    otherUser,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
};

const isParticipant = (connection, userId) =>
  [connection.requester, connection.recipient].some((participant) => {
    const participantId = participant?._id || participant;
    return participantId?.toString() === userId.toString();
  });

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const deleteConnectionRequestNotification = (connectionId) =>
  Notification.deleteMany({
    connection: connectionId,
    type: NOTIFICATION_TYPES.CONNECTION_REQUEST,
  });

export const getConnectionCount = async (req, res) => {
  try {
    const count = await Connection.countDocuments({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Connection count error:", error);
    return res.status(500).json({ message: "Failed to load connection count" });
  }
};

export const getConnectionSummary = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const [
      invitations,
      sentRequests,
      acceptedConnections,
      activeConnections,
      currentUser,
      groupsCount,
      eventsCount,
      newslettersCount,
    ] = await Promise.all([
      populateConnection(
        Connection.find({
          recipient: currentUserId,
          status: CONNECTION_STATUS.PENDING,
        }).sort({ createdAt: -1 }),
      ),
      populateConnection(
        Connection.find({
          requester: currentUserId,
          status: CONNECTION_STATUS.PENDING,
        }).sort({ createdAt: -1 }),
      ),
      populateConnection(
        Connection.find({
          status: CONNECTION_STATUS.ACCEPTED,
          $or: [{ requester: currentUserId }, { recipient: currentUserId }],
        }).sort({ updatedAt: -1 }),
      ),
      Connection.find({
        status: {
          $in: [CONNECTION_STATUS.PENDING, CONNECTION_STATUS.ACCEPTED],
        },
        $or: [{ requester: currentUserId }, { recipient: currentUserId }],
      }),
      User.findById(currentUserId).select("following"),
      Group.countDocuments(),
      Event.countDocuments(),
      Newsletter.countDocuments(),
    ]);

    const excludedUserIds = new Set([currentUserId.toString()]);

    activeConnections.forEach((connection) => {
      excludedUserIds.add(connection.requester.toString());
      excludedUserIds.add(connection.recipient.toString());
    });

    const suggestedUsers = await User.find({
      accountStatus: { $ne: "deactivated" },
      $or: [{ profileVisibility: "public" }, { profileVisibility: { $exists: false } }],
      _id: {
        $nin: [...excludedUserIds],
      },
    })
      .select(userSummaryFields)
      .sort({ createdAt: -1 })
      .limit(12);

    const suggestions = await attachConnectionStatus(
      suggestedUsers,
      currentUserId,
    );

    return res.status(200).json({
      invitations: invitations.map((connection) =>
        serializeConnection(connection, currentUserId),
      ),
      sentRequests: sentRequests.map((connection) =>
        serializeConnection(connection, currentUserId),
      ),
      connections: acceptedConnections.map((connection) =>
        serializeConnection(connection, currentUserId),
      ),
      following: currentUser?.following?.length || 0,
      suggestions,
      communityCounts: {
        groups: groupsCount,
        events: eventsCount,
        pages: 0,
        newsletters: newslettersCount,
      },
    });
  } catch (error) {
    console.error("Connection summary error:", error);

    return res.status(500).json({
      message: "Failed to load network",
    });
  }
};

export const getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(200).json({
        status: "self",
        connectionId: "",
      });
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const connection = await Connection.findOne({
      pairKey: makeConnectionPairKey(req.user._id, userId),
    });

    return res.status(200).json(
      getConnectionStatusPayload(connection, req.user._id),
    );
  } catch (error) {
    console.error("Connection status error:", error);

    return res.status(500).json({
      message: "Failed to load connection status",
    });
  }
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        message: "You cannot connect to yourself",
      });
    }

    const targetUser = await User.findById(userId).select("_id followers following dataPrivacyPreferences.connectionInvitationAudience");

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (
      targetUser.dataPrivacyPreferences?.connectionInvitationAudience === "network"
      && !targetUser.followers.some((id) => id.toString() === currentUserId.toString())
      && !targetUser.following.some((id) => id.toString() === currentUserId.toString())
    ) {
      return res.status(403).json({
        message: "This member only accepts connection requests from their network",
      });
    }

    let connection = await Connection.findOne({
      pairKey: makeConnectionPairKey(currentUserId, userId),
    });

    if (connection?.status === CONNECTION_STATUS.ACCEPTED) {
      return res.status(409).json({
        message: "You are already connected",
      });
    }

    if (connection?.status === CONNECTION_STATUS.PENDING) {
      const isRequester =
        connection.requester.toString() === currentUserId.toString();

      return res.status(409).json({
        message: isRequester
          ? "Connection request is already pending"
          : "This person already sent you a connection request",
      });
    }

    if (connection?.status === CONNECTION_STATUS.REJECTED) {
      connection.requester = currentUserId;
      connection.recipient = userId;
      connection.status = CONNECTION_STATUS.PENDING;
      await connection.save();
    } else {
      connection = await Connection.create({
        requester: currentUserId,
        recipient: userId,
      });
    }

    const populatedConnection = await populateConnection(
      Connection.findById(connection._id),
    );

    await createNotification({
      recipient: userId,
      sender: currentUserId,
      type: NOTIFICATION_TYPES.CONNECTION_REQUEST,
      connection: connection._id,
      dedupe: true,
    });

    return res.status(201).json({
      connection: serializeConnection(populatedConnection, currentUserId),
      message: "Connection request sent",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A connection already exists for these users",
      });
    }

    console.error("Send connection request error:", error);

    return res.status(500).json({
      message: "Failed to send connection request",
    });
  }
};

export const cancelConnectionRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID",
      });
    }

    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({
        message: "Connection request not found",
      });
    }

    if (connection.status !== CONNECTION_STATUS.PENDING) {
      return res.status(400).json({
        message: "Only pending requests can be cancelled",
      });
    }

    if (connection.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only cancel requests you sent",
      });
    }

    await deleteConnectionRequestNotification(connection._id);
    await connection.deleteOne();

    return res.status(200).json({
      message: "Connection request cancelled",
    });
  } catch (error) {
    console.error("Cancel connection request error:", error);

    return res.status(500).json({
      message: "Failed to cancel connection request",
    });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID",
      });
    }

    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({
        message: "Connection request not found",
      });
    }

    if (connection.status !== CONNECTION_STATUS.PENDING) {
      return res.status(400).json({
        message: "Only pending requests can be accepted",
      });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the receiver can accept this request",
      });
    }

    connection.status = CONNECTION_STATUS.ACCEPTED;
    await connection.save();
    await deleteConnectionRequestNotification(connection._id);

    const populatedConnection = await populateConnection(
      Connection.findById(connection._id),
    );

    await createNotification({
      recipient: connection.requester,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.CONNECTION_ACCEPTED,
      connection: connection._id,
    });

    return res.status(200).json({
      connection: serializeConnection(populatedConnection, req.user._id),
      message: "Connection request accepted",
    });
  } catch (error) {
    console.error("Accept connection request error:", error);

    return res.status(500).json({
      message: "Failed to accept connection request",
    });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID",
      });
    }

    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({
        message: "Connection request not found",
      });
    }

    if (connection.status !== CONNECTION_STATUS.PENDING) {
      return res.status(400).json({
        message: "Only pending requests can be rejected",
      });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the receiver can reject this request",
      });
    }

    connection.status = CONNECTION_STATUS.REJECTED;
    await connection.save();
    await deleteConnectionRequestNotification(connection._id);

    return res.status(200).json({
      message: "Connection request rejected",
    });
  } catch (error) {
    console.error("Reject connection request error:", error);

    return res.status(500).json({
      message: "Failed to reject connection request",
    });
  }
};

export const removeConnection = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid connection ID",
      });
    }

    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({
        message: "Connection not found",
      });
    }

    if (connection.status !== CONNECTION_STATUS.ACCEPTED) {
      return res.status(400).json({
        message: "Only accepted connections can be removed",
      });
    }

    if (!isParticipant(connection, req.user._id)) {
      return res.status(403).json({
        message: "You can only remove your own connections",
      });
    }

    await connection.deleteOne();

    return res.status(200).json({
      message: "Connection removed",
    });
  } catch (error) {
    console.error("Remove connection error:", error);

    return res.status(500).json({
      message: "Failed to remove connection",
    });
  }
};
