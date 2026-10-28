import mongoose from "mongoose";
import Conversation, {
  makeConversationPairKey,
} from "../models/Conversation.js";
import Message from "../models/Message.js";
import Post from "../models/Post.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import Connection, { CONNECTION_STATUS } from "../models/Connection.js";
import User from "../models/User.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";
import { createNotification } from "../utils/notificationUtils.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const participantFields = "name email headline profilePicture";

const canMessageRecipient = async (senderId, recipientId) => {
  const recipient = await User.findById(recipientId).select("_id dataPrivacyPreferences.allowMessageRequests");
  if (!recipient) return false;
  if (recipient.dataPrivacyPreferences?.allowMessageRequests !== false) return true;
  return Boolean(await Connection.exists({
    pairKey: makeConversationPairKey([senderId, recipientId]),
    status: CONNECTION_STATUS.ACCEPTED,
  }));
};

const populateConversation = (query) =>
  query
    .populate("participants", participantFields)
    .populate({
      path: "lastMessage",
      populate: [
        {
          path: "sender",
          select: "name profilePicture",
        },
        {
          path: "post",
          select: "author text image video repostOf createdAt",
          populate: {
            path: "author",
            select: "name profilePicture",
          },
        },
        {
          path: "job",
          select: "title company location type level workMode salary description",
        },
      ],
    })

const serializeConversation = (
  conversation,
  currentUserId,
  unreadCount = 0,
) => {
  const otherParticipant = conversation.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString(),
  );

  return {
    _id: conversation._id,
    type: conversation.type || "message",
    participants: conversation.participants,
    otherParticipant,
    lastMessage: conversation.lastMessage,
    unread: conversation.unreadBy?.some(
      (userId) => userId.toString() === currentUserId.toString(),
    ),
    unreadCount,
    starred: conversation.starredBy?.some(
      (userId) => userId.toString() === currentUserId.toString(),
    ),
    muted: conversation.mutedBy?.some(
      (userId) => userId.toString() === currentUserId.toString(),
    ),
    archived: conversation.archivedBy?.some(
      (userId) => userId.toString() === currentUserId.toString(),
    ),
    spam: conversation.reportedBy?.some(
      (userId) => userId.toString() === currentUserId.toString(),
    ),
    category: conversation.category || "focused",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const findAuthorizedConversation = (conversationId, currentUserId) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    return null;
  }

  return Conversation.findOne({
    _id: conversationId,
    participants: currentUserId,
  });
};

const getUnreadCountsByConversation = async (conversationIds, currentUserId) => {
  if (conversationIds.length === 0) return new Map();

  const counts = await Message.aggregate([
    {
      $match: {
        conversation: {
          $in: conversationIds,
        },
        sender: {
          $ne: currentUserId,
        },
        readBy: {
          $ne: currentUserId,
        },
      },
    },
    {
      $group: {
        _id: "$conversation",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await populateConversation(
      Conversation.find({
        participants: req.user._id,
      }).sort({ updatedAt: -1 }),
    );
    const acceptedConnections = await Connection.find({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id },
      ],
    }).select("requester recipient");
    const connectedUserIds = new Set(
      acceptedConnections.map((connection) =>
        connection.requester.toString() === req.user._id.toString()
          ? connection.recipient.toString()
          : connection.requester.toString(),
      ),
    );
    const conversationIds = conversations.map((conversation) => conversation._id);
    const unreadCounts = await getUnreadCountsByConversation(
      conversationIds,
      req.user._id,
    );

    return res.status(200).json({
      conversations: conversations.map((conversation) => {
        const serialized = serializeConversation(
          conversation,
          req.user._id,
          unreadCounts.get(conversation._id.toString()) || 0,
        );
        serialized.type = connectedUserIds.has(serialized.otherParticipant?._id?.toString())
          ? "message"
          : "inmail";
        if (serialized.otherParticipant) {
          serialized.otherParticipant.connectionStatus = connectedUserIds.has(
            serialized.otherParticipant._id.toString(),
          )
            ? "connected"
            : "not_connected";
        }
        return serialized;
      }),
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    return res.status(500).json({
      message: "Failed to load conversations",
    });
  }
};

export const getUnreadMessageCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .select("_id")
      .lean();

    const conversationIds = conversations.map((conversation) => conversation._id);

    if (conversationIds.length === 0) {
      return res.status(200).json({
        count: 0,
        conversations: 0,
      });
    }

    const [count, unreadConversationCounts] = await Promise.all([
      Message.countDocuments({
        conversation: {
          $in: conversationIds,
        },
        sender: {
          $ne: req.user._id,
        },
        readBy: {
          $ne: req.user._id,
        },
      }),
      getUnreadCountsByConversation(conversationIds, req.user._id),
    ]);

    return res.status(200).json({
      count,
      conversations: unreadConversationCounts.size,
    });
  } catch (error) {
    console.error("Unread message count error:", error);

    return res.status(500).json({
      message: "Failed to load unread message count",
    });
  }
};

export const toggleConversationStar = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await findAuthorizedConversation(
      req.params.conversationId,
      req.user._id,
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const userId = req.user._id.toString();
    const isStarred = conversation.starredBy.some(
      (starredById) => starredById.toString() === userId,
    );

    if (isStarred) {
      conversation.starredBy = conversation.starredBy.filter(
        (starredById) => starredById.toString() !== userId,
      );
    } else {
      conversation.starredBy.push(req.user._id);
    }

    await conversation.save();

    return res.status(200).json({ starred: !isStarred });
  } catch (error) {
    console.error("Toggle conversation star error:", error);
    return res.status(500).json({ message: "Failed to update conversation star" });
  }
};

export const updateConversationAction = async (req, res) => {
  try {
    const { action, value } = req.body;
    const conversation = await findAuthorizedConversation(
      req.params.conversationId,
      req.user._id,
    );

    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    const userId = req.user._id.toString();
    const toggleUser = (field, enabled) => {
      const ids = conversation[field].map(String).filter((id) => id !== userId);
      if (enabled) ids.push(userId);
      conversation[field] = ids;
    };

    if (action === "label") {
      if (!["focused", "jobs", "other"].includes(value)) {
        return res.status(400).json({ message: "Invalid conversation label" });
      }
      conversation.category = value;
    } else if (action === "unread") {
      toggleUser("unreadBy", value !== false);
      await Message.updateMany(
        { conversation: conversation._id, sender: { $ne: req.user._id } },
        value === false
          ? { $addToSet: { readBy: req.user._id } }
          : { $pull: { readBy: req.user._id } },
      );
    } else if (action === "mute") {
      toggleUser("mutedBy", value !== false);
    } else if (action === "archive") {
      toggleUser("archivedBy", value !== false);
    } else if (action === "report") {
      toggleUser("reportedBy", true);
    } else if (action === "block") {
      toggleUser("blockedBy", true);
    } else if (action === "delete") {
      await Message.deleteMany({ conversation: conversation._id });
      await conversation.deleteOne();
      return res.status(200).json({ deleted: true });
    } else if (action === "settings") {
      return res.status(200).json({ settings: true });
    } else {
      return res.status(400).json({ message: "Unsupported conversation action" });
    }

    await conversation.save();
    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );
    return res.status(200).json({
      conversation: serializeConversation(populatedConversation, req.user._id),
    });
  } catch (error) {
    console.error("Conversation action error:", error);
    return res.status(500).json({ message: "Failed to update conversation" });
  }
};

export const createOrGetConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!mongoose.isValidObjectId(participantId)) {
      return res.status(400).json({
        message: "Invalid participant ID",
      });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot message yourself",
      });
    }

    const participant = await User.findById(participantId).select("_id dataPrivacyPreferences.allowMessageRequests");

    if (!participant) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (
      participant.dataPrivacyPreferences?.allowMessageRequests === false
      && !(await Connection.exists({
        pairKey: makeConversationPairKey([req.user._id, participantId]),
        status: CONNECTION_STATUS.ACCEPTED,
      }))
    ) {
      return res.status(403).json({
        message: "This member does not accept message requests from people outside their network",
      });
    }

    const participants = [req.user._id, participantId];
    const pairKey = makeConversationPairKey(participants);
    const isConnected = Boolean(await Connection.exists({
      pairKey,
      status: CONNECTION_STATUS.ACCEPTED,
    }));

    let conversation = await Conversation.findOne({ pairKey });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        pairKey,
        type: isConnected ? "message" : "inmail",
      });
    } else if (conversation.type !== (isConnected ? "message" : "inmail")) {
      conversation.type = isConnected ? "message" : "inmail";
      await conversation.save();
    }

    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );

    return res.status(200).json({
      conversation: serializeConversation(populatedConversation, req.user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      const conversation = await populateConversation(
        Conversation.findOne({
          pairKey: makeConversationPairKey([req.user._id, req.body.participantId]),
        }),
      );

      return res.status(200).json({
        conversation: serializeConversation(conversation, req.user._id),
      });
    }

    console.error("Create conversation error:", error);

    return res.status(500).json({
      message: "Failed to create conversation",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({
        message: "Invalid conversation ID",
      });
    }

    const conversation = await findAuthorizedConversation(
      req.params.conversationId,
      req.user._id,
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const readUpdates = {
      $addToSet: {
        readBy: req.user._id,
      },
    };
    if (req.user.dataPrivacyPreferences?.messageReadReceipts !== false) {
      readUpdates.$addToSet.readReceipts = req.user._id;
    }
    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: {
          $ne: req.user._id,
        },
        readBy: {
          $ne: req.user._id,
        },
      },
      readUpdates,
    );

    conversation.unreadBy = conversation.unreadBy.filter(
      (userId) => userId.toString() !== req.user._id.toString(),
    );
    await conversation.save();

    const messages = await Message.find({
      conversation: conversation._id,
    })
      .populate("sender", "name profilePicture")
      .populate({
        path: "post",
        select: "author text image video createdAt repostOf",
        populate: {
          path: "author",
          select: "name profilePicture",
        },
      })
      .populate("job", "title company location type level workMode salary description")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      message: "Failed to load messages",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, postId, jobId } = req.body;
    const cleanText = text?.trim();

    if (!cleanText && !postId && !jobId && !req.file) {
      return res.status(400).json({
        message: "Message text or post is required",
      });
    }

    if (cleanText && cleanText.length > 2000) {
      return res.status(400).json({
        message: "Message must be 2000 characters or fewer",
      });
    }

    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({
        message: "Invalid conversation ID",
      });
    }

    const conversation = await findAuthorizedConversation(
      req.params.conversationId,
      req.user._id,
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const recipientId = conversation.participants.find(
      (participantId) => participantId.toString() !== req.user._id.toString(),
    );
    if (recipientId && !(await canMessageRecipient(req.user._id, recipientId))) {
      return res.status(403).json({
        message: "This member does not accept message requests from people outside their network",
      });
    }

    let post = null;
    let job = null;
    let attachment = null;
    if (req.file) {
      const resourceType = req.file.mimetype.startsWith("image/")
        ? "image"
        : req.file.mimetype.startsWith("video/")
          ? "video"
          : "raw";
      const uploadResult = await uploadBufferToCloudinary(req.file, {
        folder: "careerlink/messages",
        resource_type: resourceType,
      });
      attachment = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        name: req.file.originalname,
        type: req.file.mimetype,
      };
    }

    if (postId) {
      if (!mongoose.isValidObjectId(postId)) {
        return res.status(400).json({
          message: "Invalid post ID",
        });
      }

      post = await Post.findById(postId).select("_id author text image video");

      if (!post) {
        return res.status(404).json({
          message: "Post not found",
        });
      }
    }

    if (jobId) {
      if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      job = await Job.findById(jobId).select("_id title company location type level workMode salary description");
      if (!job) return res.status(404).json({ message: "Job not found" });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: cleanText || (post ? "Shared a post" : job ? "Shared a job" : attachment ? `Sent ${req.file.originalname}` : ""),
      post: post?._id || null,
      job: job?._id || null,
      attachment,
      readBy: [req.user._id],
    });

    const otherParticipants = conversation.participants.filter(
      (participantId) =>
        participantId.toString() !== req.user._id.toString(),
    );

    await Conversation.updateOne(
      {
        _id: conversation._id,
      },
      {
        $set: {
          lastMessage: message._id,
        },
        $addToSet: {
          unreadBy: {
            $each: otherParticipants,
          },
        },
      },
    );
    const isConnected = Boolean(await Connection.exists({
      pairKey: conversation.pairKey,
      status: CONNECTION_STATUS.ACCEPTED,
    }));
    conversation.type = isConnected ? "message" : "inmail";
    await conversation.save();

    const populatedMessage = await message.populate([
      { path: "sender", select: "name profilePicture" },
      { path: "post", select: "author text image video repostOf createdAt", populate: { path: "author", select: "name profilePicture" } },
    ]);

    const candidateApplications = await JobApplication.find({ applicant: req.user._id })
      .populate({ path: "job", select: "_id title company postedBy" })
      .select("job");
    await Promise.all(otherParticipants.map((participantId) => {
      const candidateApplication = candidateApplications.find(
        (application) => application.job?.postedBy?.toString() === participantId.toString(),
      );
      return createNotification({
        recipient: participantId,
        sender: req.user._id,
        type: candidateApplication
          ? NOTIFICATION_TYPES.HIRING_CANDIDATE_MESSAGE
          : conversation.type === "inmail"
            ? NOTIFICATION_TYPES.INMAIL_MESSAGE
            : NOTIFICATION_TYPES.MESSAGE,
        conversation: conversation._id,
        message: message._id,
        job: candidateApplication?.job?._id || null,
      });
    }));

    return res.status(201).json({
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      message: "Failed to send message",
    });
  }
};
export const updateMessageAction = async (req, res) => {
  try {
    const { action, emoji, text } = req.body;
    const message = await Message.findOne({ _id: req.params.messageId, conversation: req.params.conversationId });
    const conversation = await findAuthorizedConversation(req.params.conversationId, req.user._id);
    if (!message || !conversation) return res.status(404).json({ message: "Message not found" });
    if (action === "react") {
      message.reactions = message.reactions.filter((reaction) => reaction.user.toString() !== req.user._id.toString());
      if (emoji) message.reactions.push({ user: req.user._id, emoji });
    } else if (action === "reply") {
      if (!text?.trim()) return res.status(400).json({ message: "Reply text is required" });
      const recipientId = conversation.participants.find(
        (participantId) => participantId.toString() !== req.user._id.toString(),
      );
      if (recipientId && !(await canMessageRecipient(req.user._id, recipientId))) {
        return res.status(403).json({ message: "This member does not accept message requests from people outside their network" });
      }
      const reply = await Message.create({ conversation: conversation._id, sender: req.user._id, text: text.trim(), replyTo: message._id, readBy: [req.user._id] });
      await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessage: reply._id }, $addToSet: { unreadBy: { $each: conversation.participants.filter((id) => id.toString() !== req.user._id.toString()) } } });
      return res.status(201).json({ message: await reply.populate("sender", "name profilePicture") });
    } else if (action === "delete") {
      await message.deleteOne();
      return res.status(200).json({ deleted: true, messageId: message._id });
    } else return res.status(400).json({ message: "Unsupported message action" });
    await message.save();
    return res.status(200).json({ message });
  } catch (error) {
    console.error("Message action error:", error);
    return res.status(500).json({ message: "Failed to update message" });
  }
};
