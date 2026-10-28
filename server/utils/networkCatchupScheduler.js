import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Connection, { CONNECTION_STATUS } from "../models/Connection.js";
import Conversation from "../models/Conversation.js";
import Group from "../models/Group.js";
import Job from "../models/Job.js";
import Post from "../models/Post.js";
import { createNotification } from "./notificationUtils.js";
import { sendNotificationEmail, isNotificationEmailConfigured } from "./notificationEmail.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const sendProfileRecommendations = async () => {
  const users = await User.find({
    "notificationPreferences.profileUpdatesEnabled": { $ne: false },
  }).select("_id profilePicture headline industry experience education skills");

  for (const user of users) {
    const recommendation = !user.profilePicture
      ? "Add a profile photo to help people recognize you."
      : !user.headline?.trim()
        ? "Add a professional headline to explain what you do."
        : !user.industry?.trim()
          ? "Add your industry to help people discover your profile."
          : !user.experience?.length
            ? "Add your work experience to give your profile more context."
            : !user.education?.length
              ? "Add your education to complete your profile."
              : !user.skills?.length
                ? "Add your skills to help others understand your expertise."
                : "";
    if (!recommendation) continue;

    const details = `Profile recommendation: ${recommendation}`;
    const alreadySent = await Notification.exists({
      recipient: user._id,
      type: NOTIFICATION_TYPES.PROFILE_RECOMMENDATION,
      details,
    });
    if (alreadySent) continue;
    await createNotification({
      recipient: user._id,
      type: NOTIFICATION_TYPES.PROFILE_RECOMMENDATION,
      details,
    });
  }
};

const sendUpcomingEventReminders = async () => {
  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcomingEvents = await Event.find({
    startsAt: { $gt: now, $lte: reminderWindowEnd },
    cancelledAt: null,
    attendees: { $exists: true, $ne: [] },
  }).select("_id title startsAt organizer attendees");

  for (const event of upcomingEvents) {
    const alreadyReminded = await Notification.distinct("recipient", {
      event: event._id,
      type: NOTIFICATION_TYPES.EVENT_REMINDER,
    });
    const alreadyRemindedIds = new Set(alreadyReminded.map((recipient) => recipient.toString()));
    await Promise.all(event.attendees
      .filter((attendee) => !alreadyRemindedIds.has(attendee.toString()))
      .map((attendee) => createNotification({
        recipient: attendee,
        sender: event.organizer,
        type: NOTIFICATION_TYPES.EVENT_REMINDER,
        event: event._id,
        details: `${event.title} starts within the next 24 hours.`,
      })));
  }
};

const tokenize = (value) => String(value || "")
  .toLowerCase()
  .split(/[^a-z0-9+#]+/)
  .filter((token) => token.length > 2);

const sendJobRecommendations = async () => {
  const [users, jobs] = await Promise.all([
    User.find({ accountStatus: { $ne: "deactivated" }, "notificationPreferences.jobSearchNotificationsEnabled": { $ne: false } })
      .select("_id skills headline industry experience")
      .lean(),
    Job.find({ status: "open", postedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
      .select("_id title company industry jobFunction tags postedBy savedBy postedAt")
      .sort({ postedAt: -1 })
      .limit(500),
  ]);
  for (const user of users) {
    const terms = new Set([
      ...tokenize(user.headline),
      ...tokenize(user.industry),
      ...(user.skills || []).flatMap(tokenize),
      ...(user.experience || []).flatMap((entry) => [...tokenize(entry.position), ...tokenize(entry.company)]),
    ]);
    if (!terms.size) continue;
    const alreadyRecommended = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.JOB_RECOMMENDATION,
      job: { $ne: null },
    }).select("job").lean()).map((item) => item.job.toString()));
    const matches = jobs.map((job) => ({
      job,
      score: [...tokenize(`${job.title} ${job.industry} ${job.jobFunction} ${(job.tags || []).join(" ")}`)]
        .reduce((score, token) => score + (terms.has(token) ? 1 : 0), 0),
    }))
      .filter(({ job, score }) => score > 0
        && job.postedBy?.toString() !== user._id.toString()
        && !alreadyRecommended.has(job._id.toString())
        && !job.savedBy?.some((savedBy) => savedBy.toString() === user._id.toString()))
      .sort((a, b) => b.score - a.score || b.job.postedAt - a.job.postedAt)
      .slice(0, 3);
    for (const { job } of matches) {
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.JOB_RECOMMENDATION, job: job._id })) continue;
      await createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.JOB_RECOMMENDATION,
        job: job._id,
        details: `A job matching your profile may interest you: ${job.title}${job.company ? ` at ${job.company}` : ""}.`,
        dedupe: true,
      });
    }
  }
};

const sendNetworkRecommendations = async () => {
  const [users, connections] = await Promise.all([
    User.find({ accountStatus: { $ne: "deactivated" }, "notificationPreferences.connectionNotifications": { $ne: false } })
      .select("_id following followers")
      .lean(),
    Connection.find({ status: CONNECTION_STATUS.ACCEPTED }).select("requester recipient").lean(),
  ]);
  const adjacency = new Map(users.map((user) => [user._id.toString(), new Set()]));
  for (const connection of connections) {
    const requesterId = connection.requester.toString();
    const recipientId = connection.recipient.toString();
    adjacency.get(requesterId)?.add(recipientId);
    adjacency.get(recipientId)?.add(requesterId);
  }
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  for (const user of users) {
    const userId = user._id.toString();
    const direct = adjacency.get(userId) || new Set();
    const candidates = new Map();
    for (const friendId of direct) {
      for (const candidateId of adjacency.get(friendId) || []) {
        if (candidateId !== userId && !direct.has(candidateId)) {
          candidates.set(candidateId, (candidates.get(candidateId) || 0) + 1);
        }
      }
    }
    const existingConnectionSuggestions = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.CONNECTION_RECOMMENDATION,
      sender: { $ne: null },
    }).select("sender").lean()).map((item) => item.sender.toString()));
    const connectionSuggestions = [...candidates.entries()]
      .filter(([candidateId]) => !existingConnectionSuggestions.has(candidateId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [candidateId] of connectionSuggestions) {
      if (!usersById.has(candidateId)) continue;
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.CONNECTION_RECOMMENDATION, sender: candidateId })) continue;
      await createNotification({
        recipient: user._id,
        sender: candidateId,
        type: NOTIFICATION_TYPES.CONNECTION_RECOMMENDATION,
        details: "Someone in your extended network may be a good connection.",
        dedupe: true,
      });
    }

    const following = new Set((user.following || []).map(String));
    const followedCandidates = new Set();
    for (const friendId of direct) {
      for (const followedId of usersById.get(friendId)?.following || []) {
        const candidateId = followedId.toString();
        if (candidateId !== userId && !following.has(candidateId)) followedCandidates.add(candidateId);
      }
    }
    const existingFollowSuggestions = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.FOLLOW_RECOMMENDATION,
      sender: { $ne: null },
    }).select("sender").lean()).map((item) => item.sender.toString()));
    for (const candidateId of [...followedCandidates].filter((id) => !existingFollowSuggestions.has(id)).slice(0, 3)) {
      if (!usersById.has(candidateId)) continue;
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.FOLLOW_RECOMMENDATION, sender: candidateId })) continue;
      await createNotification({
        recipient: user._id,
        sender: candidateId,
        type: NOTIFICATION_TYPES.FOLLOW_RECOMMENDATION,
        details: "A member followed by people in your network may interest you.",
        dedupe: true,
      });
    }
  }
};

const sendBirthdayNotifications = async () => {
  const today = new Date();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const dayKey = today.toISOString().slice(0, 10);
  const members = await User.find({
    accountStatus: { $ne: "deactivated" },
    birthDate: { $type: "date" },
    birthdayVisibility: { $in: ["connections", "everyone"] },
  }).select("_id name birthDate birthdayVisibility");
  for (const member of members) {
    if (member.birthDate.getUTCMonth() !== month || member.birthDate.getUTCDate() !== day) continue;
    const recipients = member.birthdayVisibility === "everyone"
      ? await User.find({ _id: { $ne: member._id }, accountStatus: { $ne: "deactivated" } }).select("_id").lean()
      : (await Connection.find({
        status: CONNECTION_STATUS.ACCEPTED,
        $or: [{ requester: member._id }, { recipient: member._id }],
      }).select("requester recipient").lean()).map((connection) => ({
        _id: connection.requester.toString() === member._id.toString()
          ? connection.recipient
          : connection.requester,
      }));
    await Promise.all(recipients.map((recipient) => createNotification({
      recipient: recipient._id,
      sender: member._id,
      type: NOTIFICATION_TYPES.BIRTHDAY,
      details: `${member.name} has a birthday today (${dayKey}).`,
      dedupe: true,
    })));
  }
};

const sendGroupAndEventRecommendations = async () => {
  const [users, groups, events] = await Promise.all([
    User.find({ accountStatus: { $ne: "deactivated" } }).select("_id skills industry").lean(),
    Group.find({ privacy: "public" }).select("_id name category description members").sort({ createdAt: -1 }).limit(200).lean(),
    Event.find({
      startsAt: { $gt: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      cancelledAt: null,
    }).select("_id title startsAt attendees").sort({ startsAt: 1 }).limit(200).lean(),
  ]);
  for (const user of users) {
    const terms = new Set([...tokenize(user.industry), ...(user.skills || []).flatMap(tokenize)]);
    const existingGroups = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.GROUP_RECOMMENDATION,
      group: { $ne: null },
    }).select("group").lean()).map((item) => item.group.toString()));
    const relevantGroups = groups.filter((group) => !existingGroups.has(group._id.toString())
      && !group.members?.some((id) => id.toString() === user._id.toString())
      && [...tokenize(`${group.name} ${group.category} ${group.description}`)].some((term) => terms.has(term)))
      .slice(0, 2);
    for (const group of relevantGroups) {
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.GROUP_RECOMMENDATION, group: group._id })) continue;
      await createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.GROUP_RECOMMENDATION,
        group: group._id,
        details: `A public group may match your interests: ${group.name}.`,
        dedupe: true,
      });
    }
    const existingEvents = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.EVENT_RECOMMENDATION,
      event: { $ne: null },
    }).select("event").lean()).map((item) => item.event.toString()));
    const recommendations = events.filter((event) => !existingEvents.has(event._id.toString())
      && !event.attendees?.some((id) => id.toString() === user._id.toString())).slice(0, 2);
    for (const event of recommendations) {
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.EVENT_RECOMMENDATION, event: event._id })) continue;
      await createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.EVENT_RECOMMENDATION,
        event: event._id,
        details: `Upcoming event you may be interested in: ${event.title}.`,
        dedupe: true,
      });
    }
  }
};

const getPublicPosts = async (since, limit = 100) => Post.aggregate([
  {
    $match: {
      group: null,
      groupPostStatus: { $nin: ["pending", "rejected"] },
      createdAt: { $gte: since },
      $or: [{ text: { $ne: "" } }, { "image.url": { $ne: "" } }, { "video.url": { $ne: "" } }],
    },
  },
  { $lookup: { from: User.collection.name, localField: "author", foreignField: "_id", as: "authorProfile" } },
  { $unwind: "$authorProfile" },
  {
    $match: {
      "authorProfile.accountStatus": { $ne: "deactivated" },
      "authorProfile.profileVisibility": { $in: ["public", null] },
      "authorProfile.activityVisibility": { $in: ["public", null] },
    },
  },
  {
    $addFields: {
      engagement: {
        $add: [
          { $size: { $ifNull: ["$likes", []] } },
          { $ifNull: ["$commentsCount", 0] },
          { $size: { $ifNull: ["$reactions", []] } },
        ],
      },
    },
  },
  { $project: { _id: 1, author: 1, text: 1, createdAt: 1, engagement: 1 } },
  { $sort: { createdAt: -1 } },
  { $limit: limit },
]);

const sendPostRecommendations = async () => {
  const [users, posts] = await Promise.all([
    User.find({ accountStatus: { $ne: "deactivated" } }).select("_id").lean(),
    getPublicPosts(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 100),
  ]);
  for (const user of users) {
    const existingPosts = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.SUGGESTED_POST,
      post: { $ne: null },
    }).select("post").lean()).map((item) => item.post.toString()));
    const candidates = posts.filter((post) => post.author.toString() !== user._id.toString()
      && !existingPosts.has(post._id.toString())).slice(0, 2);
    for (const post of candidates) {
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.SUGGESTED_POST, post: post._id })) continue;
      await createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.SUGGESTED_POST,
        post: post._id,
        details: "A public post you may find interesting is available in your feed.",
        dedupe: true,
      });
    }
  }
  const trending = [...posts].filter((post) => post.engagement >= 5).sort((a, b) => b.engagement - a.engagement).slice(0, 5);
  for (const user of users) {
    const existingTrending = new Set((await Notification.find({
      recipient: user._id,
      type: NOTIFICATION_TYPES.TRENDING_CONVERSATION,
      post: { $ne: null },
    }).select("post").lean()).map((item) => item.post.toString()));
    for (const post of trending) {
      if (post.author.toString() === user._id.toString()) continue;
      if (existingTrending.has(post._id.toString())) continue;
      if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.TRENDING_CONVERSATION, post: post._id })) continue;
      await createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.TRENDING_CONVERSATION,
        post: post._id,
        details: "A public CareerLink conversation is gaining attention.",
        dedupe: true,
      });
    }
  }
};

const sendPostAndMessageReminders = async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS);
  const activeUsers = await User.find({ accountStatus: { $ne: "deactivated" } }).select("_id").lean();
  for (const user of activeUsers) {
    const hasRecentPost = await Post.exists({ author: user._id, createdAt: { $gte: weekAgo } });
    if (hasRecentPost) continue;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const weekKey = weekStart.toISOString().slice(0, 10);
    const reminderDetails = `It's been a while since you shared a post. Share an update with your network. (${weekKey})`;
    if (await Notification.exists({ recipient: user._id, type: NOTIFICATION_TYPES.POST_REMINDER, details: reminderDetails })) continue;
    await createNotification({
      recipient: user._id,
      type: NOTIFICATION_TYPES.POST_REMINDER,
      details: reminderDetails,
      dedupe: true,
    });
  }

  const conversations = await Conversation.find({
    unreadBy: { $exists: true, $ne: [] },
  }).populate("lastMessage", "sender createdAt").limit(5000);
  for (const conversation of conversations) {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage || !lastMessage.createdAt || now.getTime() - lastMessage.createdAt.getTime() < 24 * 60 * 60 * 1000) continue;
    for (const recipient of conversation.unreadBy) {
      if (conversation.archivedBy.some((userId) => userId.toString() === recipient.toString())) continue;
      if (conversation.mutedBy.some((userId) => userId.toString() === recipient.toString())) continue;
      if (lastMessage.sender?.toString() === recipient.toString()) continue;
      const isInmail = conversation.type === "inmail";
      const type = isInmail ? NOTIFICATION_TYPES.INMAIL_REMINDER : NOTIFICATION_TYPES.UNREAD_MESSAGE_REMINDER;
      if (await Notification.exists({ recipient, type, message: lastMessage._id })) continue;
      await createNotification({
        recipient,
        type,
        conversation: conversation._id,
        message: lastMessage._id,
        details: isInmail ? "You have an unread InMail waiting for you." : "You have an unread message waiting for you.",
        dedupe: true,
      });
    }
  }
};

let lastRecommendationRunDay = "";
const sendBirthdayAndRecommendationFlows = async () => {
  const day = new Date().toISOString().slice(0, 10);
  if (lastRecommendationRunDay === day) return;
  await Promise.all([
    sendJobRecommendations(),
    sendNetworkRecommendations(),
    sendBirthdayNotifications(),
    sendGroupAndEventRecommendations(),
    sendPostRecommendations(),
    sendPostAndMessageReminders(),
  ]);
  lastRecommendationRunDay = day;
};
const catchupTypes = [
  NOTIFICATION_TYPES.NETWORK_JOB_CHANGE,
  NOTIFICATION_TYPES.NETWORK_HIRING,
  NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY,
  NOTIFICATION_TYPES.NETWORK_EDUCATION,
];
const sendWeeklySummaries = async () => {
  if (!isNotificationEmailConfigured()) return;
  const now = new Date();
  const dueBefore = new Date(now.getTime() - WEEK_MS);
  const users = await User.find({
    "notificationPreferences.networkCatchupEnabled": { $ne: false },
    "notificationPreferences.networkWeeklySummaryEmail": { $ne: false },
    "notificationPreferences.emailNotifications": { $ne: false },
    email: { $exists: true, $ne: "" },
    $or: [
      { "notificationPreferences.networkWeeklySummaryLastSentAt": { $lte: dueBefore } },
      { "notificationPreferences.networkWeeklySummaryLastSentAt": { $exists: false } },
    ],
  }).select("_id email notificationPreferences.networkWeeklySummaryLastSentAt");

  for (const user of users) {
    const lastSentAt = user.notificationPreferences?.networkWeeklySummaryLastSentAt;
    if (!lastSentAt) {
      await User.updateOne(
        { _id: user._id },
        { $set: { "notificationPreferences.networkWeeklySummaryLastSentAt": now } },
      );
      continue;
    }

    const since = new Date(Math.max(lastSentAt.getTime(), now.getTime() - WEEK_MS));
    const notifications = await Notification.find({
      recipient: user._id,
      type: { $in: catchupTypes },
      createdAt: { $gt: since, $lte: now },
    })
      .select("type details sender")
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    try {
      if (notifications.length) {
        const typeLabels = {
          [NOTIFICATION_TYPES.NETWORK_JOB_CHANGE]: "Job changes",
          [NOTIFICATION_TYPES.NETWORK_HIRING]: "Hiring updates",
          [NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY]: "Work anniversaries",
          [NOTIFICATION_TYPES.NETWORK_EDUCATION]: "Education updates",
        };
        const counts = notifications.reduce((result, notification) => {
          result[notification.type] = (result[notification.type] || 0) + 1;
          return result;
        }, {});
        const summary = Object.entries(counts)
          .map(([type, count]) => `${typeLabels[type]}: ${count}`)
          .join("\n");
        const recentUpdates = notifications.slice(0, 5).map((notification) =>
          notification.details || `${notification.sender?.name || "Your network"} shared an update.`,
        );
        await sendNotificationEmail({
          to: user.email,
          subject: "Your CareerLink weekly network summary",
          text: `Your network catch-up for the past week:\n\n${summary}\n\nRecent updates:\n${recentUpdates.join("\n")}`,
        });
      }
      await User.updateOne(
        { _id: user._id },
        { $set: { "notificationPreferences.networkWeeklySummaryLastSentAt": now } },
      );
    } catch (error) {
      console.error(`Weekly network summary delivery failed for user ${user._id}:`, error.message);
    }
  }
};

const sendPostActivitySummaries = async () => {
  if (!isNotificationEmailConfigured()) return;
  const now = new Date();
  const dueBefore = new Date(now.getTime() - WEEK_MS);
  const users = await User.find({
    "notificationPreferences.postingNotificationsEnabled": { $ne: false },
    "notificationPreferences.emailNotifications": { $ne: false },
    email: { $exists: true, $ne: "" },
    $or: [
      {
        "notificationPreferences.postCommentsReactionsEmail": { $ne: false },
        "notificationPreferences.postCommentsReactionsEmailFrequency": { $in: ["weekly", "recommended"] },
      },
      {
        "notificationPreferences.postMentionsEmail": { $ne: false },
        "notificationPreferences.postMentionsEmailFrequency": { $in: ["weekly", "recommended"] },
      },
    ],
    $and: [{
      $or: [
        { "notificationPreferences.postActivityWeeklySummaryLastSentAt": { $lte: dueBefore } },
        { "notificationPreferences.postActivityWeeklySummaryLastSentAt": { $exists: false } },
      ],
    }],
  }).select("_id email notificationPreferences.postActivityWeeklySummaryLastSentAt notificationPreferences.postCommentsReactionsEmail notificationPreferences.postCommentsReactionsEmailFrequency notificationPreferences.postMentionsEmail notificationPreferences.postMentionsEmailFrequency");

  for (const user of users) {
    const lastSentAt = user.notificationPreferences?.postActivityWeeklySummaryLastSentAt;
    if (!lastSentAt) {
      await User.updateOne(
        { _id: user._id },
        { $set: { "notificationPreferences.postActivityWeeklySummaryLastSentAt": now } },
      );
      continue;
    }

    const preferences = user.notificationPreferences;
    const enabledTypes = [];
    if (
      preferences.postCommentsReactionsEmail !== false
      && preferences.postCommentsReactionsEmailFrequency !== "individual"
    ) {
      enabledTypes.push(NOTIFICATION_TYPES.POST_LIKE, NOTIFICATION_TYPES.POST_COMMENT);
    }
    if (
      preferences.postMentionsEmail !== false
      && preferences.postMentionsEmailFrequency !== "individual"
    ) {
      enabledTypes.push(NOTIFICATION_TYPES.MENTION);
    }

    const since = new Date(Math.max(lastSentAt.getTime(), now.getTime() - WEEK_MS));
    const notifications = enabledTypes.length
      ? await Notification.find({
        recipient: user._id,
        type: { $in: enabledTypes },
        createdAt: { $gt: since, $lte: now },
      })
        .select("type sender")
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      : [];

    try {
      if (notifications.length) {
        const activityLines = notifications.slice(0, 10).map((notification) => {
          const senderName = notification.sender?.name || "Someone";
          if (notification.type === NOTIFICATION_TYPES.POST_LIKE) return `${senderName} reacted to your post.`;
          if (notification.type === NOTIFICATION_TYPES.POST_COMMENT) return `${senderName} commented on your post.`;
          return `${senderName} mentioned you in a post or comment.`;
        });
        await sendNotificationEmail({
          to: user.email,
          subject: "Your CareerLink posting and commenting summary",
          text: `Your posting and commenting activity from the past week (${notifications.length} updates):\n\n${activityLines.join("\n")}`,
        });
      }
      await User.updateOne(
        { _id: user._id },
        { $set: { "notificationPreferences.postActivityWeeklySummaryLastSentAt": now } },
      );
    } catch (error) {
      console.error(`Weekly post activity summary delivery failed for user ${user._id}:`, error.message);
    }
  }
};

const sendMessagingGroupSummaries = async () => {
  if (!isNotificationEmailConfigured()) return;
  const now = new Date();
  const dueBefore = new Date(now.getTime() - WEEK_MS);
  const users = await User.find({
    "notificationPreferences.emailNotifications": { $ne: false },
    email: { $exists: true, $ne: "" },
    $and: [
      {
        $or: [
          {
            "notificationPreferences.messageNotifications": { $ne: false },
            "notificationPreferences.messageEmailNotifications": { $ne: false },
            "notificationPreferences.messageEmailFrequency": { $in: ["weekly", "recommended"] },
          },
          {
            "notificationPreferences.groupNotificationsEnabled": { $ne: false },
            "notificationPreferences.groupInvitationsEmail": { $ne: false },
            "notificationPreferences.groupInvitationsEmailFrequency": { $in: ["weekly", "recommended"] },
          },
        ],
      },
      {
        $or: [
          { "notificationPreferences.messagingGroupsWeeklySummaryLastSentAt": { $lte: dueBefore } },
          { "notificationPreferences.messagingGroupsWeeklySummaryLastSentAt": { $exists: false } },
        ],
      },
    ],
  }).select("_id email notificationPreferences");

  for (const user of users) {
    const preferences = user.notificationPreferences;
    const enabledTypes = [];
    if (
      preferences.messageNotifications !== false
      && preferences.messageEmailNotifications !== false
      && preferences.messageEmailFrequency !== "individual"
    ) enabledTypes.push(NOTIFICATION_TYPES.MESSAGE);
    if (
      preferences.groupNotificationsEnabled !== false
      && preferences.groupInvitationsEmail !== false
      && preferences.groupInvitationsEmailFrequency !== "individual"
    ) enabledTypes.push(NOTIFICATION_TYPES.GROUP_INVITATION);

    const since = new Date(Math.max(
      preferences.messagingGroupsWeeklySummaryLastSentAt?.getTime() || 0,
      now.getTime() - WEEK_MS,
    ));
    const notifications = enabledTypes.length
      ? await Notification.find({
        recipient: user._id,
        type: { $in: enabledTypes },
        createdAt: { $gt: since, $lte: now },
      })
        .select("type details sender")
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      : [];

    try {
      if (notifications.length) {
        const lines = notifications.slice(0, 10).map((notification) =>
          notification.details || (notification.type === NOTIFICATION_TYPES.MESSAGE
            ? `${notification.sender?.name || "A CareerLink member"} sent you a message.`
            : `${notification.sender?.name || "A CareerLink member"} invited you to join a group.`),
        );
        await sendNotificationEmail({
          to: user.email,
          subject: "Your CareerLink messaging and groups summary",
          text: `You have ${notifications.length} messaging and group invitation updates from the past week:\n\n${lines.join("\n")}`,
        });
      }
      await User.updateOne(
        { _id: user._id },
        { $set: { "notificationPreferences.messagingGroupsWeeklySummaryLastSentAt": now } },
      );
    } catch (error) {
      console.error(`Weekly messaging and group summary delivery failed for user ${user._id}:`, error.message);
    }
  }
};

let lastAnniversaryRunDay = "";
const sendWorkAnniversaryNotifications = async () => {
  const today = new Date();
  const runDay = today.toISOString().slice(0, 10);
  if (lastAnniversaryRunDay === runDay) return;
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const users = await User.find({
    "experience.startDate": { $type: "date" },
    shareProfileUpdates: { $ne: false },
  }).select("_id name experience");

  for (const member of users) {
    const anniversaries = member.experience.filter((entry) => {
      const startDate = entry.startDate;
      return entry.currentlyWorking
        && startDate
        && startDate.getUTCMonth() === month
        && startDate.getUTCDate() === day
        && today.getUTCFullYear() > startDate.getUTCFullYear();
    });
    if (!anniversaries.length) continue;

    const acceptedConnections = await Connection.find({
      status: CONNECTION_STATUS.ACCEPTED,
      $or: [{ requester: member._id }, { recipient: member._id }],
    }).select("requester recipient");
    const recipients = acceptedConnections.map((connection) =>
      connection.requester.toString() === member._id.toString()
        ? connection.recipient
        : connection.requester,
    );
    const details = `${member.name} is celebrating a work anniversary${anniversaries[0].company ? ` at ${anniversaries[0].company}` : ""}.`;
    await Promise.all(recipients.map(async (recipient) => {
      const alreadyNotified = await Notification.exists({
        recipient,
        sender: member._id,
        type: NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY,
        createdAt: { $gte: new Date(Date.UTC(today.getUTCFullYear(), month, day)) },
      });
      if (alreadyNotified) return null;
      return createNotification({
        recipient,
        sender: member._id,
        type: NOTIFICATION_TYPES.NETWORK_WORK_ANNIVERSARY,
        details,
      });
    }));
  }
  lastAnniversaryRunDay = runDay;
};

export const startNetworkCatchupScheduler = () => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await Promise.all([
        sendWeeklySummaries(),
        sendPostActivitySummaries(),
        sendMessagingGroupSummaries(),
        sendWorkAnniversaryNotifications(),
        sendUpcomingEventReminders(),
        sendProfileRecommendations(),
        sendBirthdayAndRecommendationFlows(),
      ]);
    } catch (error) {
      console.error("Network catch-up scheduler failed:", error);
    } finally {
      running = false;
    }
  };

  void run();
  return setInterval(run, 60 * 60 * 1000);
};
