import mongoose from "mongoose";

export const NOTIFICATION_TYPES = {
  POST_LIKE: "post_like",
  POST_COMMENT: "post_comment",
  CONNECTION_REQUEST: "connection_request",
  CONNECTION_ACCEPTED: "connection_accepted",
  NEW_FOLLOWER: "new_follower",
  PROFILE_VIEW: "profile_view",
  MESSAGE: "message",
  HIRING_CANDIDATE_MESSAGE: "hiring_candidate_message",
  JOB_ALERT: "job_alert",
  SAVED_JOB_UPDATE: "saved_job_update",
  JOB_APPLICATION: "job_application",
  JOB_APPLICATION_STATUS: "job_application_status",
  JOB_INVITE: "job_invite",
  MENTION: "mention",
  GROUP_POST: "group_post",
  GROUP_INVITATION: "group_invitation",
  EVENT_INVITATION: "event_invitation",
  EVENT_REMINDER: "event_reminder",
  EVENT_ATTENDEE_UPDATE: "event_attendee_update",
  EVENT_SPEAKER_INVITATION: "event_speaker_invitation",
  EVENT_ORGANIZER_UPDATE: "event_organizer_update",
  PROFILE_RECOMMENDATION: "profile_recommendation",
  JOB_RECOMMENDATION: "job_recommendation",
  SEARCH_APPEARANCE: "search_appearance",
  CONNECTION_RECOMMENDATION: "connection_recommendation",
  FOLLOW_RECOMMENDATION: "follow_recommendation",
  BIRTHDAY: "birthday",
  SUGGESTED_POST: "suggested_post",
  TRENDING_CONVERSATION: "trending_conversation",
  POST_REMINDER: "post_reminder",
  UNREAD_MESSAGE_REMINDER: "unread_message_reminder",
  INMAIL_MESSAGE: "inmail_message",
  INMAIL_REMINDER: "inmail_reminder",
  GROUP_RECOMMENDATION: "group_recommendation",
  EVENT_RECOMMENDATION: "event_recommendation",
  FOLLOWED_POST: "followed_post",
  NETWORK_JOB_CHANGE: "network_job_change",
  NETWORK_HIRING: "network_hiring",
  NETWORK_WORK_ANNIVERSARY: "network_work_anniversary",
  NETWORK_EDUCATION: "network_education",
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    newsletter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Newsletter",
      default: null,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
      default: null,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index(
  { recipient: 1, job: 1, type: 1 },
  { name: "unique_job_alert", unique: true, partialFilterExpression: { job: { $type: "objectId" }, type: "job_alert" } },
);
notificationSchema.index(
  { recipient: 1, event: 1, type: 1 },
  { name: "unique_event_reminder", unique: true, partialFilterExpression: { event: { $type: "objectId" }, type: "event_reminder" } },
);
notificationSchema.index(
  { recipient: 1, group: 1, type: 1 },
  { name: "unique_group_recommendation", unique: true, partialFilterExpression: { group: { $type: "objectId" }, type: "group_recommendation" } },
);
notificationSchema.index(
  { recipient: 1, type: 1, details: 1 },
  { name: "unique_daily_search_appearance", unique: true, partialFilterExpression: { type: "search_appearance" } },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
