import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Newsletter from "../models/Newsletter.js";
import { sendNotificationEmail } from "./notificationEmail.js";

export const createNotification = async ({
  recipient,
  sender,
  type,
  post = null,
  comment = null,
  connection = null,
  conversation = null,
  message = null,
  job = null,
  group = null,
  newsletter = null,
  event = null,
  details = "",
  dedupe = false,
}) => {
  if (!recipient) return null;

  if (sender && recipient.toString() === sender.toString()) {
    return null;
  }

  try {
    const recipientUser = await User.findById(recipient).select("email name notificationPreferences");
    const preferences = recipientUser?.notificationPreferences;
    const jobSearchTypes = ["job_alert", "saved_job_update", "job_application_status", "job_recommendation", "search_appearance"];
    const connectionTypes = [
      "connection_request",
      "connection_accepted",
      "post_like",
      "post_comment",
      "new_follower",
      "followed_post",
      "profile_view",
    ];
    const networkCatchupTypes = [
      "network_job_change",
      "network_hiring",
      "network_work_anniversary",
      "network_education",
    ];
    const eventTypes = [
      "event_invitation",
      "event_reminder",
      "event_attendee_update",
      "event_speaker_invitation",
      "event_organizer_update",
    ];
    const messageTypes = ["message", "unread_message_reminder", "inmail_message", "inmail_reminder"];
    const postingFeatureTypes = ["suggested_post", "trending_conversation", "post_reminder"];
    const connectionRecommendationTypes = ["connection_recommendation", "follow_recommendation"];
    const postingTypes = ["post_like", "post_comment", "mention", "followed_post"];
    const isNewsletterNotification = type === "new_follower" && Boolean(newsletter);
    const postingNotification = postingTypes.includes(type) || isNewsletterNotification;
    const emailFrequencyKeyByType = {
      post_like: "postCommentsReactionsEmailFrequency",
      post_comment: "postCommentsReactionsEmailFrequency",
      mention: "postMentionsEmailFrequency",
    };
    const preferenceKeyByType = {
      connection_request: "connectionNotifications",
      connection_accepted: "connectionNotifications",
      message: "messageNotifications",
      job_alert: "jobAlerts",
    };
    const messageGroupDigestEnabled = preferences?.emailNotifications !== false
      && Boolean(recipientUser?.email)
      && (
        (type === "message"
          && preferences?.messageNotifications !== false
          && preferences?.messageEmailNotifications !== false
          && preferences?.messageEmailFrequency !== "individual")
        || (type === "group_invitation"
          && preferences?.groupNotificationsEnabled !== false
          && preferences?.groupInvitationsEmail !== false
          && preferences?.groupInvitationsEmailFrequency !== "individual")
      );
    const emailPreferenceKeyByType = {
      message: "messageEmailNotifications",
      group_invitation: "groupInvitationsEmail",
      event_invitation: "eventInvitationsEmail",
      event_reminder: "eventRemindersEmail",
      event_attendee_update: "eventAttendeeUpdatesEmail",
      event_speaker_invitation: "eventSpeakerInvitationsEmail",
      event_organizer_update: "eventOrganizerUpdatesEmail",
      profile_recommendation: "profileRecommendationsEmail",
      job_recommendation: "jobRecommendationsEmail",
      search_appearance: "searchAppearancesEmail",
      connection_recommendation: "connectionRecommendationsEmail",
      follow_recommendation: "followRecommendationsEmail",
      birthday: "networkBirthdaysEmail",
      suggested_post: "suggestedPostsEmail",
      trending_conversation: "trendingConversationsEmail",
      post_reminder: "postRemindersEmail",
      unread_message_reminder: "unreadMessageRemindersEmail",
      inmail_message: "inmailNotificationsEmail",
      inmail_reminder: "inmailRemindersEmail",
      group_recommendation: "groupRecommendationsEmail",
      event_recommendation: "eventRecommendationsEmail",
      group_post: "groupUpdatesEmail",
      job_alert: "jobAlertEmailNotifications",
      saved_job_update: "savedJobEmailNotifications",
      job_application_status: "applicationUpdateEmailNotifications",
      job_application: "hiringJobPostUpdatesEmail",
      hiring_candidate_message: "hiringCandidateMessagesEmail",
      connection_request: "connectionInvitationsEmail",
      connection_accepted: "connectionInvitationsEmail",
      post_like: "postCommentsReactionsEmail",
      post_comment: "postCommentsReactionsEmail",
      mention: "postMentionsEmail",
      new_follower: "newFollowersEmail",
      followed_post: "postSharesEmail",
      profile_view: "profileViewsEmail",
    };
    const inAppPreferenceKeyByType = {
      job_application: "hiringJobPostUpdatesInApp",
      hiring_candidate_message: "hiringCandidateMessagesInApp",
      connection_request: "connectionInvitationsInApp",
      connection_accepted: "connectionInvitationsInApp",
      post_like: "postCommentsReactionsInApp",
      post_comment: "postCommentsReactionsInApp",
      group_post: "groupUpdatesInApp",
      group_invitation: "groupInvitationsInApp",
      event_invitation: "eventInvitationsInApp",
      event_reminder: "eventRemindersInApp",
      event_attendee_update: "eventAttendeeUpdatesInApp",
      event_speaker_invitation: "eventSpeakerInvitationsInApp",
      event_organizer_update: "eventOrganizerUpdatesInApp",
      profile_recommendation: "profileRecommendationsInApp",
      job_recommendation: "jobRecommendationsInApp",
      search_appearance: "searchAppearancesInApp",
      connection_recommendation: "connectionRecommendationsInApp",
      follow_recommendation: "followRecommendationsInApp",
      birthday: "networkBirthdaysInApp",
      suggested_post: "suggestedPostsInApp",
      trending_conversation: "trendingConversationsInApp",
      post_reminder: "postRemindersInApp",
      unread_message_reminder: "unreadMessageRemindersInApp",
      inmail_message: "inmailNotificationsInApp",
      inmail_reminder: "inmailRemindersInApp",
      group_recommendation: "groupRecommendationsInApp",
      event_recommendation: "eventRecommendationsInApp",
      new_follower: "newFollowersInApp",
      followed_post: "postSharesInApp",
      profile_view: "profileViewsInApp",
      mention: "postMentionsInApp",
      network_job_change: "networkJobChangesInApp",
      network_hiring: "networkHiringInApp",
      network_work_anniversary: "networkWorkAnniversariesInApp",
      network_education: "networkEducationInApp",
    };
    const hiringType = type === "job_application" || type === "hiring_candidate_message";
    const postActivityFrequency = preferences?.[emailFrequencyKeyByType[type]] || "individual";
    const inAppEnabled = !preferences?.hiddenNotificationTypes?.includes(type)
      && preferences?.[inAppPreferenceKeyByType[type]] !== false
      && (!postingNotification || preferences?.postingNotificationsEnabled !== false)
      && (!(type === "post_like" || type === "post_comment")
        || preferences?.networkUpdatesInApp !== false)
      && (type !== "followed_post" || preferences?.followedPeopleUpdatesInApp !== false)
      && (!isNewsletterNotification || preferences?.postNewslettersInApp !== false)
      && (!eventTypes.includes(type) || preferences?.eventNotificationsEnabled !== false)
      && (type !== "profile_recommendation" || preferences?.profileUpdatesEnabled !== false)
      && (type !== "profile_recommendation" || preferences?.profileRecommendationsInApp !== false)
      && (!(type === "job_recommendation" || type === "search_appearance") || preferences?.jobSearchNotificationsEnabled !== false)
      && (!(type === "connection_recommendation" || type === "follow_recommendation") || preferences?.connectionNotifications !== false)
      && (!(type === "suggested_post" || type === "trending_conversation" || type === "post_reminder") || preferences?.postingNotificationsEnabled !== false)
      && (!(type === "unread_message_reminder" || type === "inmail_message" || type === "inmail_reminder") || preferences?.messageNotifications !== false)
      && (type !== "group_recommendation" || preferences?.groupNotificationsEnabled !== false)
      && (!(type === "birthday") || preferences?.networkCatchupEnabled !== false)
      && (!(type === "event_recommendation") || preferences?.eventNotificationsEnabled !== false)
      && (!(type === "group_post" || type === "group_invitation")
        || preferences?.groupNotificationsEnabled !== false)
      && (!hiringType || preferences?.hiringNotificationsEnabled !== false);
    const postActivityWeeklyDigestEnabled = postingNotification
      && preferences?.postingNotificationsEnabled !== false
      && preferences?.emailNotifications !== false
      && Boolean(recipientUser?.email)
      && (
        (type === "post_like" || type === "post_comment")
          ? preferences?.postCommentsReactionsEmail !== false
            && preferences?.networkUpdatesEmail !== false
            && postActivityFrequency !== "individual"
          : type === "mention"
            ? preferences?.postMentionsEmail !== false && postActivityFrequency !== "individual"
            : false
      );
    const weeklyDigestEnabled = networkCatchupTypes.includes(type)
      && preferences?.networkCatchupEnabled !== false
      && preferences?.networkWeeklySummaryEmail !== false
      && preferences?.emailNotifications !== false
      && Boolean(recipientUser?.email);
    const emailEnabled = Boolean(
      emailPreferenceKeyByType[type]
      && recipientUser?.email
      && preferences?.emailNotifications !== false
      && preferences?.[emailPreferenceKeyByType[type]] !== false
      && (!eventTypes.includes(type) || preferences?.eventNotificationsEnabled !== false)
      && (type !== "profile_recommendation" || preferences?.profileUpdatesEnabled !== false)
      && (type !== "profile_recommendation" || preferences?.profileRecommendationsEmail !== false)
      && (!(type === "job_recommendation" || type === "search_appearance") || preferences?.jobSearchNotificationsEnabled !== false)
      && (!(type === "connection_recommendation" || type === "follow_recommendation") || preferences?.connectionNotifications !== false)
      && (!(type === "suggested_post" || type === "trending_conversation" || type === "post_reminder") || preferences?.postingNotificationsEnabled !== false)
      && (!(type === "unread_message_reminder" || type === "inmail_message" || type === "inmail_reminder") || preferences?.messageNotifications !== false)
      && (type !== "group_recommendation" || preferences?.groupNotificationsEnabled !== false)
      && (!(type === "birthday") || preferences?.networkCatchupEnabled !== false)
      && (!(type === "event_recommendation") || preferences?.eventNotificationsEnabled !== false)
      && (type !== "message" || preferences?.messageNotifications !== false)
      && (!(type === "group_post" || type === "group_invitation")
        || preferences?.groupNotificationsEnabled !== false)
      && (type !== "group_invitation"
        || preferences?.groupInvitationsEmailFrequency === "individual")
      && (type !== "message"
        || preferences?.messageEmailFrequency === "individual")
      && (!postingNotification || preferences?.postingNotificationsEnabled !== false)
      && (!(type === "post_like" || type === "post_comment")
        || preferences?.networkUpdatesEmail !== false)
      && (type !== "followed_post" || preferences?.followedPeopleUpdatesEmail !== false)
      && (!isNewsletterNotification || preferences?.postNewslettersEmail !== false)
      && (!(type === "post_like" || type === "post_comment" || type === "mention")
        || postActivityFrequency === "individual")
      && (!hiringType || preferences?.hiringNotificationsEnabled !== false),
    );
    if (
      !recipientUser ||
      (networkCatchupTypes.includes(type) && preferences?.networkCatchupEnabled === false) ||
      (postingNotification && preferences?.postingNotificationsEnabled === false) ||
      (type === "message" && preferences?.messageNotifications === false) ||
      (messageTypes.includes(type) && preferences?.messageNotifications === false) ||
      ((type === "group_post" || type === "group_invitation")
        && preferences?.groupNotificationsEnabled === false) ||
      (postingFeatureTypes.includes(type) && preferences?.postingNotificationsEnabled === false) ||
      (connectionRecommendationTypes.includes(type) && preferences?.connectionNotifications === false) ||
      (type === "job_recommendation" && preferences?.jobSearchNotificationsEnabled === false) ||
      (type === "group_recommendation" && preferences?.groupNotificationsEnabled === false) ||
      (type === "birthday" && preferences?.networkCatchupEnabled === false) ||
      (type === "event_recommendation" && preferences?.eventNotificationsEnabled === false) ||
      (connectionTypes.includes(type) && preferences?.connectionNotifications === false) ||
      (jobSearchTypes.includes(type) && preferences?.jobSearchNotificationsEnabled === false) ||
      (preferenceKeyByType[type] && preferences?.[preferenceKeyByType[type]] === false) ||
      (sender && preferences?.mutedSenders?.some((mutedSender) => mutedSender.toString() === sender.toString())) ||
      (!inAppEnabled && !emailEnabled && !weeklyDigestEnabled && !postActivityWeeklyDigestEnabled && !messageGroupDigestEnabled)
    ) {
      return null;
    }

    const payload = {
      recipient,
      sender,
      type,
      post,
      comment,
      connection,
      conversation,
      message,
      job,
      group,
      newsletter,
      event,
      details,
    };

    let notification;
    if (dedupe) {
      const existing = await Notification.findOne(payload);
      if (existing) return existing;
      notification = await Notification.findOneAndUpdate(
        payload,
        {
          $setOnInsert: payload,
          $set: {
            read: false,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      notification = await Notification.create(payload);
    }

    if (emailEnabled) {
      try {
        const jobDetails = job ? await Job.findById(job).select("title company").lean() : null;
        const newsletterDetails = newsletter ? await Newsletter.findById(newsletter).select("name").lean() : null;
        const senderUser = sender ? await User.findById(sender).select("name").lean() : null;
        const jobTitle = jobDetails?.title || "a job";
        const company = jobDetails?.company ? ` at ${jobDetails.company}` : "";
        const notificationText = details
          ? details
          : type === "job_alert"
          ? `A new job matching your alert is available: ${jobTitle}${company}.`
          : type === "saved_job_update"
            ? `A job you saved is no longer accepting applications: ${jobTitle}${company}.`
            : type === "job_application"
              ? `${senderUser?.name || "A candidate"} applied for ${jobTitle}${company}.`
              : type === "hiring_candidate_message"
                ? `${senderUser?.name || "A candidate"} sent you a message about ${jobTitle}${company}.`
                  : type === "job_application_status"
                    ? `There is an update to your application for ${jobTitle}${company}.`
                    : type === "connection_request"
                      ? `${senderUser?.name || "A CareerLink member"} sent you a connection invitation.`
                      : type === "connection_accepted"
                        ? `${senderUser?.name || "A CareerLink member"} accepted your connection invitation.`
                      : type === "message"
                        ? `${senderUser?.name || "A CareerLink member"} sent you a message.`
                        : type === "inmail_message"
                          ? `${senderUser?.name || "A CareerLink member"} sent you an InMail message.`
                          : type === "unread_message_reminder"
                            ? "You have an unread CareerLink message waiting for you."
                            : type === "inmail_reminder"
                              ? "You have an unread InMail message waiting for you."
                        : type === "group_invitation"
                          ? details || `${senderUser?.name || "A CareerLink member"} invited you to join a group.`
                        : type === "new_follower" && newsletterDetails
                          ? `${senderUser?.name || "A CareerLink member"} subscribed to your newsletter, ${newsletterDetails.name}.`
                          : type === "new_follower"
                            ? `${senderUser?.name || "A CareerLink member"} started following you.`
                          : type === "profile_view"
                            ? `${senderUser?.name || "A CareerLink member"} viewed your profile.`
                            : type === "mention"
                              ? `${senderUser?.name || "A CareerLink member"} mentioned you in a ${comment ? "comment" : "post"}.`
                            : type === "followed_post"
                              ? `${senderUser?.name || "Someone you follow"} shared a new post.`
                              : type === "post_like"
                                ? `${senderUser?.name || "Someone"} liked your post.`
                                : type === "post_comment"
                                  ? `${senderUser?.name || "Someone"} commented on your post.`
                                  : type === "group_post"
                                    ? `${senderUser?.name || "Someone"} shared a new post in your group.`
                                    : "You have a new CareerLink notification.";
        await sendNotificationEmail({
          to: recipientUser.email,
          subject: "CareerLink notification",
          text: notificationText,
        });
      } catch (error) {
        console.error("Job notification email delivery failed:", error.message);
      }
    }
    return notification;
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};

export const notifyProfileMentions = async ({ text, sender, post = null, comment = null }) => {
  if (typeof text !== "string") return;
  const slugs = [...new Set(
    [...text.matchAll(/@([a-z0-9-]{3,40})/gi)].map((match) => match[1].toLowerCase()),
  )];
  if (!slugs.length) return;
  try {
    const users = await User.find({
      publicProfileSlug: { $in: slugs },
      _id: { $ne: sender },
    }).select("_id");
    await Promise.all(users.map((user) => createNotification({
      recipient: user._id,
      sender,
      type: "mention",
      post,
      comment,
      dedupe: true,
    })));
  } catch (error) {
    console.error("Mention notification delivery failed:", error.message);
  }
};
