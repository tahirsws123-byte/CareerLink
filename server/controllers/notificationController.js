import mongoose from "mongoose";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";

const senderFields = "name headline profilePicture";
const visibleNotificationsFilter = (user) => {
  const preferences = user.notificationPreferences;
  const hiddenTypes = preferences?.hiddenNotificationTypes || [];
  const mutedSenders = preferences?.mutedSenders || [];
  const hiddenTypesWithJobSearchDisabled = [
    ...(preferences?.jobSearchNotificationsEnabled === false
      ? [NOTIFICATION_TYPES.JOB_ALERT, NOTIFICATION_TYPES.SAVED_JOB_UPDATE, NOTIFICATION_TYPES.JOB_APPLICATION_STATUS]
      : []),
    ...(preferences?.jobAlerts === false ? [NOTIFICATION_TYPES.JOB_ALERT] : []),
    ...(preferences?.hiringNotificationsEnabled === false
      ? [NOTIFICATION_TYPES.JOB_APPLICATION, NOTIFICATION_TYPES.HIRING_CANDIDATE_MESSAGE]
      : []),
    ...(preferences?.hiringJobPostUpdatesInApp === false ? [NOTIFICATION_TYPES.JOB_APPLICATION] : []),
    ...(preferences?.hiringCandidateMessagesInApp === false ? [NOTIFICATION_TYPES.HIRING_CANDIDATE_MESSAGE] : []),
    ...(preferences?.connectionNotifications === false
      ? [
        NOTIFICATION_TYPES.CONNECTION_REQUEST,
        NOTIFICATION_TYPES.CONNECTION_ACCEPTED,
        NOTIFICATION_TYPES.POST_LIKE,
        NOTIFICATION_TYPES.POST_COMMENT,
        NOTIFICATION_TYPES.NEW_FOLLOWER,
        NOTIFICATION_TYPES.FOLLOWED_POST,
        NOTIFICATION_TYPES.PROFILE_VIEW,
      ]
      : []),
    ...(preferences?.connectionInvitationsInApp === false
      ? [NOTIFICATION_TYPES.CONNECTION_REQUEST, NOTIFICATION_TYPES.CONNECTION_ACCEPTED]
      : []),
    ...(preferences?.networkUpdatesInApp === false
      ? [NOTIFICATION_TYPES.POST_LIKE, NOTIFICATION_TYPES.POST_COMMENT]
      : []),
    ...(preferences?.postingNotificationsEnabled === false
      ? [
        NOTIFICATION_TYPES.POST_LIKE,
        NOTIFICATION_TYPES.POST_COMMENT,
        NOTIFICATION_TYPES.MENTION,
        NOTIFICATION_TYPES.FOLLOWED_POST,
      ]
      : []),
    ...(preferences?.postCommentsReactionsInApp === false
      ? [NOTIFICATION_TYPES.POST_LIKE, NOTIFICATION_TYPES.POST_COMMENT]
      : []),
    ...(preferences?.postSharesInApp === false
      ? [NOTIFICATION_TYPES.FOLLOWED_POST]
      : []),
    ...(preferences?.postMentionsInApp === false
      ? [NOTIFICATION_TYPES.MENTION]
      : []),
    ...(preferences?.newFollowersInApp === false ? [NOTIFICATION_TYPES.NEW_FOLLOWER] : []),
    ...(preferences?.followedPeopleUpdatesInApp === false ? [NOTIFICATION_TYPES.FOLLOWED_POST] : []),
    ...(preferences?.profileViewsInApp === false ? [NOTIFICATION_TYPES.PROFILE_VIEW] : []),
    ...(preferences?.networkCatchupEnabled === false
      ? [
        NOTIFICATION_TYPES.NETWORK_JOB_CHANGE,
        NOTIFICATION_TYPES.NETWORK_HIRING,
        NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY,
        NOTIFICATION_TYPES.NETWORK_EDUCATION,
      ]
      : []),
    ...(preferences?.networkJobChangesInApp === false ? [NOTIFICATION_TYPES.NETWORK_JOB_CHANGE] : []),
    ...(preferences?.networkHiringInApp === false ? [NOTIFICATION_TYPES.NETWORK_HIRING] : []),
    ...(preferences?.networkWorkAnniversariesInApp === false ? [NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY] : []),
    ...(preferences?.networkEducationInApp === false ? [NOTIFICATION_TYPES.NETWORK_EDUCATION] : []),
    ...(preferences?.messageNotifications === false ? [NOTIFICATION_TYPES.MESSAGE] : []),
    ...((preferences?.groupNotificationsEnabled === false || preferences?.groupUpdatesInApp === false)
      ? [NOTIFICATION_TYPES.GROUP_POST]
      : []),
    ...((preferences?.groupNotificationsEnabled === false || preferences?.groupInvitationsInApp === false)
      ? [NOTIFICATION_TYPES.GROUP_INVITATION]
      : []),
    ...(preferences?.eventNotificationsEnabled === false
      ? [
        NOTIFICATION_TYPES.EVENT_INVITATION,
        NOTIFICATION_TYPES.EVENT_REMINDER,
        NOTIFICATION_TYPES.EVENT_ATTENDEE_UPDATE,
        NOTIFICATION_TYPES.EVENT_SPEAKER_INVITATION,
        NOTIFICATION_TYPES.EVENT_ORGANIZER_UPDATE,
      ]
      : []),
    ...(preferences?.eventInvitationsInApp === false ? [NOTIFICATION_TYPES.EVENT_INVITATION] : []),
    ...(preferences?.eventRemindersInApp === false ? [NOTIFICATION_TYPES.EVENT_REMINDER] : []),
    ...(preferences?.eventAttendeeUpdatesInApp === false ? [NOTIFICATION_TYPES.EVENT_ATTENDEE_UPDATE] : []),
    ...(preferences?.eventSpeakerInvitationsInApp === false ? [NOTIFICATION_TYPES.EVENT_SPEAKER_INVITATION] : []),
    ...(preferences?.eventOrganizerUpdatesInApp === false ? [NOTIFICATION_TYPES.EVENT_ORGANIZER_UPDATE] : []),
    ...(preferences?.profileUpdatesEnabled === false
      || preferences?.profileRecommendationsInApp === false
      ? [NOTIFICATION_TYPES.PROFILE_RECOMMENDATION]
      : []),
  ];

  return {
    recipient: user._id,
    type: { $nin: [...hiddenTypes, ...hiddenTypesWithJobSearchDisabled] },
    ...(preferences?.postingNotificationsEnabled === false || preferences?.postNewslettersInApp === false
      ? { $nor: [{ type: NOTIFICATION_TYPES.NEW_FOLLOWER, newsletter: { $ne: null } }] }
      : {}),
    ...(mutedSenders.length ? { sender: { $nin: mutedSenders } } : {}),
  };
};

const buildNotificationText = (notification) => {
  const name = notification.sender?.name || "Someone";

  switch (notification.type) {
    case NOTIFICATION_TYPES.POST_LIKE:
      return `${name} liked your post.`;
    case NOTIFICATION_TYPES.POST_COMMENT:
      return `${name} commented on your post.`;
    case NOTIFICATION_TYPES.CONNECTION_REQUEST:
      return `${name} sent you a connection request.`;
    case NOTIFICATION_TYPES.CONNECTION_ACCEPTED:
      return `${name} accepted your connection request.`;
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return notification.newsletter
        ? `${name} subscribed to your newsletter, ${notification.newsletter.name}.`
        : `${name} started following you.`;
    case NOTIFICATION_TYPES.PROFILE_VIEW:
      return `${name} viewed your profile.`;
    case NOTIFICATION_TYPES.MESSAGE:
    case NOTIFICATION_TYPES.HIRING_CANDIDATE_MESSAGE:
    case NOTIFICATION_TYPES.INMAIL_MESSAGE:
      return `${name} sent you a message.`;
    case NOTIFICATION_TYPES.INMAIL_REMINDER:
      return notification.details || "You have an unread InMail message.";
    case NOTIFICATION_TYPES.UNREAD_MESSAGE_REMINDER:
      return notification.details || "You have an unread message waiting for you.";
    case NOTIFICATION_TYPES.JOB_ALERT:
      return `New job matching your alert: ${notification.job?.title || "a new role"}${notification.job?.company ? ` at ${notification.job.company}` : ""}.`;
    case NOTIFICATION_TYPES.JOB_RECOMMENDATION:
      return notification.details || `A job you may like is available: ${notification.job?.title || "a new role"}${notification.job?.company ? ` at ${notification.job.company}` : ""}.`;
    case NOTIFICATION_TYPES.SEARCH_APPEARANCE:
    case NOTIFICATION_TYPES.CONNECTION_RECOMMENDATION:
    case NOTIFICATION_TYPES.FOLLOW_RECOMMENDATION:
    case NOTIFICATION_TYPES.BIRTHDAY:
    case NOTIFICATION_TYPES.SUGGESTED_POST:
    case NOTIFICATION_TYPES.TRENDING_CONVERSATION:
    case NOTIFICATION_TYPES.POST_REMINDER:
    case NOTIFICATION_TYPES.GROUP_RECOMMENDATION:
    case NOTIFICATION_TYPES.EVENT_RECOMMENDATION:
      return notification.details || "You have a new CareerLink update.";
    case NOTIFICATION_TYPES.SAVED_JOB_UPDATE:
      return `A job you saved is no longer accepting applications: ${notification.job?.title || "a saved job"}${notification.job?.company ? ` at ${notification.job.company}` : ""}.`;
    case NOTIFICATION_TYPES.JOB_APPLICATION:
      return `${name} applied for ${notification.job?.title || "your job"}.`;
    case NOTIFICATION_TYPES.JOB_APPLICATION_STATUS:
      return `${name} updated your application for ${notification.job?.title || "a job"}.`;
    case NOTIFICATION_TYPES.JOB_INVITE:
      return `${name} invited you to apply for ${notification.job?.title || "a job"}.`;
    case NOTIFICATION_TYPES.MENTION:
      return `${name} mentioned you in a ${notification.comment ? "comment" : "post"}.`;
    case NOTIFICATION_TYPES.GROUP_POST:
      return `${name} shared a new post in ${notification.group?.name || "a group"}.`;
    case NOTIFICATION_TYPES.GROUP_INVITATION:
      return notification.details || `${name} invited you to join ${notification.group?.name || "a group"}.`;
    case NOTIFICATION_TYPES.EVENT_INVITATION:
    case NOTIFICATION_TYPES.EVENT_REMINDER:
    case NOTIFICATION_TYPES.EVENT_ATTENDEE_UPDATE:
    case NOTIFICATION_TYPES.EVENT_SPEAKER_INVITATION:
    case NOTIFICATION_TYPES.EVENT_ORGANIZER_UPDATE:
      return notification.details || `${name} shared an event update.`;
    case NOTIFICATION_TYPES.PROFILE_RECOMMENDATION:
      return notification.details || "Improve your profile to help others learn more about you.";
    case NOTIFICATION_TYPES.FOLLOWED_POST:
      return `${name} shared a new post.`;
    case NOTIFICATION_TYPES.NETWORK_JOB_CHANGE:
    case NOTIFICATION_TYPES.NETWORK_HIRING:
    case NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY:
    case NOTIFICATION_TYPES.NETWORK_EDUCATION:
      return notification.details || `${name} shared a network update.`;
    default:
      return `${name} sent you a notification.`;
  }
};

const serializeNotification = (notification) => ({
  _id: notification._id,
  type: notification.type,
  sender: notification.sender,
  post: notification.post,
  comment: notification.comment,
  connection: notification.connection,
  conversation: notification.conversation,
  message: notification.message,
  job: notification.job,
  group: notification.group,
  newsletter: notification.newsletter,
  event: notification.event,
  details: notification.details,
  read: notification.read,
  createdAt: notification.createdAt,
  text: buildNotificationText(notification),
});

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find(visibleNotificationsFilter(req.user))
      .populate("sender", senderFields)
      .populate("post", "text image")
      .populate("comment", "text")
      .populate("job", "title company")
      .populate("group", "name")
      .populate("newsletter", "name")
      .populate("event", "title startsAt cancelledAt")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      notifications: notifications.map(serializeNotification),
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Failed to load notifications",
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      ...visibleNotificationsFilter(req.user),
      read: false,
    });

    return res.status(200).json({
      count,
    });
  } catch (error) {
    console.error("Unread notification count error:", error);

    return res.status(500).json({
      message: "Failed to load notification count",
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
      },
      {
        read: true,
      },
      {
        new: true,
      },
    ).populate("sender", senderFields).populate("job", "title company").populate("group", "name").populate("event", "title startsAt cancelledAt");

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      notification: serializeNotification(notification),
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      message: "Failed to update notification",
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        ...visibleNotificationsFilter(req.user),
        read: false,
      },
      {
        read: true,
      },
    );

    return res.status(200).json({
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      message: "Failed to delete notification",
    });
  }
};

export const showLessLikeThis = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    }).select("type");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await req.user.updateOne({
      $addToSet: { "notificationPreferences.hiddenNotificationTypes": notification.type },
    });

    return res.status(200).json({ message: "You will see fewer notifications like this" });
  } catch (error) {
    console.error("Show less notifications error:", error);

    return res.status(500).json({ message: "Failed to update notification preferences" });
  }
};

export const muteNotificationSender = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    }).select("sender");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (!notification.sender) {
      return res.status(400).json({ message: "This notification is not associated with a sender" });
    }

    await req.user.updateOne({
      $addToSet: { "notificationPreferences.mutedSenders": notification.sender },
    });

    return res.status(200).json({ message: "Notifications from this account are turned off" });
  } catch (error) {
    console.error("Mute notification sender error:", error);

    return res.status(500).json({ message: "Failed to update notification preferences" });
  }
};
