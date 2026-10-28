import mongoose from "mongoose";
import Group from "../models/Group.js";
import Event from "../models/Event.js";
import EventReport from "../models/EventReport.js";
import EventCommentReport from "../models/EventCommentReport.js";
import Newsletter from "../models/Newsletter.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";
import { createNotification, notifyProfileMentions } from "../utils/notificationUtils.js";
import { destroyCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const userFields = "name headline profilePicture";
const groupOwnerFields = `${userFields} coverPicture`;
const validId = (value) => mongoose.isValidObjectId(value);
const text = (value, field, max, required = false) => {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw Object.assign(new Error(`${field} must be text`), { statusCode: 400 });
  }
  const result = value.trim();
  if (required && !result) throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  if (result.length > max) throw Object.assign(new Error(`${field} must be ${max} characters or fewer`), { statusCode: 400 });
  return result;
};
const notifyEventUsers = async ({ recipients, sender, type, event, details }) => Promise.all(
  [...new Set(recipients.map((recipient) => recipient.toString()))].map((recipient) =>
    createNotification({ recipient, sender, type, event, details }),
  ),
);

export const toggleGroupNotifications = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const userId = req.user._id.toString();
    if (group.blockedMembers?.some((member) => member.toString() === userId)) {
      return res.status(403).json({ message: "You are blocked from this group" });
    }
    if (!group.members.some((member) => member.toString() === userId)) {
      return res.status(403).json({ message: "Join this group to manage its notifications" });
    }
    const notificationMembers = group.notificationMembers || [];
    const enabled = notificationMembers.some((member) => member.toString() === userId);
    group.notificationMembers = enabled
      ? notificationMembers.filter((member) => member.toString() !== userId)
      : [...notificationMembers, req.user._id];
    await group.save();
    return res.json({ enabled: !enabled });
  } catch (error) {
    return respondError(res, error, "Failed to update group notifications");
  }
};
const idError = (message) => Object.assign(new Error(message), { statusCode: 400 });
const respondError = (res, error, fallback) => {
  const status = error.statusCode || 500;
  if (status === 500) console.error(fallback, error);
  return res.status(status).json({ message: status === 500 ? fallback : error.message });
};
const populate = (query, fields) => query.populate(fields);

export const listGroups = async (req, res) => {
  try {
    const search = text(req.query.search || "", "Search", 80);
    const visibilityFilter = {
      $or: [
        { privacy: "public", showInSearch: { $ne: false } },
        { members: req.user._id },
        { owner: req.user._id },
        { requestedMembers: req.user._id },
      ],
    };
    const filter = search
      ? { $and: [visibilityFilter, { $text: { $search: search } }] }
      : visibilityFilter;
    const groups = await populate(Group.find(filter).sort({ createdAt: -1 }).limit(50), [
      { path: "owner", select: userFields },
      { path: "members", select: userFields },
      { path: "requestedMembers", select: "_id" },
    ]);
    res.json({ groups: groups.map((group) => {
      const serialized = group.toObject();
      const isRequested = group.requestedMembers.some((member) => member._id.equals(req.user._id));
      delete serialized.requestedMembers;
      return { ...serialized, memberCount: group.members.length, isMember: group.members.some((member) => member._id.equals(req.user._id)), isRequested, isOwner: group.owner._id.equals(req.user._id) };
    }) });
  } catch (error) { respondError(res, error, "Failed to load groups"); }
};

export const createGroup = async (req, res) => {
  const uploadedAssets = [];
  try {
    const imageFile = req.files?.image?.[0];
    const coverImageFile = req.files?.coverImage?.[0];
    for (const [file, label] of [[imageFile, "Group icon"], [coverImageFile, "Group cover image"]]) {
      if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        throw idError(`${label} must be JPG, PNG, or WEBP`);
      }
    }
    let image = { url: "", publicId: "" };
    let coverImage = { url: "", publicId: "" };
    if (imageFile) {
      const uploaded = await uploadBufferToCloudinary(imageFile, {
        folder: "careerlink/group-images",
        resource_type: "image",
      });
      uploadedAssets.push(uploaded.public_id);
      image = { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
    }
    if (coverImageFile) {
      const uploaded = await uploadBufferToCloudinary(coverImageFile, {
        folder: "careerlink/group-covers",
        resource_type: "image",
      });
      uploadedAssets.push(uploaded.public_id);
      coverImage = { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
    }
    const group = await Group.create({
      name: text(req.body.name, "Name", 120, true),
      description: text(req.body.description, "Description", 2000, true),
      category: text(req.body.category || "Professional", "Category", 80),
      location: text(req.body.location || "", "Location", 200),
      rules: text(req.body.rules || "", "Rules", 2000),
      privacy: req.body.privacy === "private" ? "private" : "public",
      joinApprovalMode: req.body.privacy === "private" ? "approval" : "open",
      contentReviewMode: req.body.requirePostApproval === "true" ? "all" : "none",
      requirePostApproval: req.body.requirePostApproval === "true",
      showInSearch: req.body.showInSearch !== "false",
      image,
      coverImage,
      owner: req.user._id,
      members: [req.user._id],
      membershipEvents: [{ user: req.user._id, action: "joined", date: new Date() }],
    });
    res.status(201).json({ group: await populate(Group.findById(group._id), { path: "owner", select: userFields }) });
  } catch (error) {
    await Promise.all(uploadedAssets.filter(Boolean).map((publicId) => destroyCloudinaryAsset(publicId)));
    respondError(res, error, "Failed to create group");
  }
};

export const getGroup = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId)
      .populate("owner", groupOwnerFields)
      .populate("members", userFields)
      .populate("admins", userFields)
      .populate("requestedMembers", userFields)
      .lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.blockedMembers?.some((member) => member.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "You are blocked from this group" });
    }
    const members = group.members || [];
    const requestedMembers = group.requestedMembers || [];
    const isMember = members.some((member) => member._id.toString() === req.user._id.toString());
    const isRequested = requestedMembers.some((member) => member._id.toString() === req.user._id.toString());
    if (group.privacy === "private" && !isMember && !isRequested) {
      return res.json({
        group: {
          _id: group._id,
          name: group.name,
          category: group.category,
          privacy: group.privacy,
          joinApprovalMode: group.joinApprovalMode || (group.privacy === "private" ? "approval" : "open"),
          image: group.image,
          coverImage: group.coverImage,
          owner: group.owner,
          memberCount: members.length,
          isMember: false,
          isOwner: false,
          isRequested: false,
          description: "",
          posts: [],
          requestedMembers: [],
          joinRequestCount: 0,
          pinnedPostIds: [],
          notificationsEnabled: false,
          postCount: 0,
        },
        currentUserId: req.user._id,
      });
    }
    if (group.privacy === "private" && !isMember && isRequested) {
      return res.json({
        group: {
          _id: group._id, name: group.name, category: group.category, privacy: group.privacy,
          joinApprovalMode: group.joinApprovalMode || (group.privacy === "private" ? "approval" : "open"),
          image: group.image, coverImage: group.coverImage, owner: group.owner, memberCount: members.length,
          isMember: false, isOwner: false, isRequested: true, description: "",
          posts: [], requestedMembers: [], joinRequestCount: 0, postCount: 0,
          pinnedPostIds: [],
          notificationsEnabled: false,
        },
        currentUserId: req.user._id,
      });
    }
    const isOwner = group.owner?._id?.toString() === req.user._id.toString();
    const pendingExpiresBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    if (isOwner) {
      await Post.updateMany(
        { group: group._id, groupPostStatus: "pending", createdAt: { $lt: pendingExpiresBefore } },
        { $set: { groupPostStatus: "rejected" } },
      );
    }
    const postFilter = {
      group: group._id,
      groupPostStatus: { $nin: isOwner ? ["rejected"] : ["pending", "rejected"] },
    };
    let posts = await Post.find(postFilter)
      .populate("author", `${userFields} publicProfileSlug`)
      .populate({ path: "repostOf", populate: { path: "author", select: `${userFields} publicProfileSlug` } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const visiblePostIds = posts
      .filter((post) => post.groupPostStatus === "approved")
      .map((post) => post._id);
    if (visiblePostIds.length) {
      await Post.updateMany({ _id: { $in: visiblePostIds } }, { $inc: { impressions: 1 } });
      posts = await Post.find(postFilter)
        .populate("author", `${userFields} publicProfileSlug`)
        .populate({ path: "repostOf", populate: { path: "author", select: `${userFields} publicProfileSlug` } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }
    const repostCounts = visiblePostIds.length
      ? await Post.aggregate([
        { $match: { repostOf: { $in: visiblePostIds } } },
        { $group: { _id: "$repostOf", count: { $sum: 1 } } },
      ])
      : [];
    const repostCountByPostId = new Map(repostCounts.map((item) => [item._id.toString(), item.count]));
    const [postCount, activeMembers, pendingPostCount] = await Promise.all([
      Post.countDocuments({ group: group._id, groupPostStatus: "approved" }),
      Promise.resolve(members.length),
      isOwner
        ? Post.countDocuments({ group: group._id, groupPostStatus: "pending", createdAt: { $gte: pendingExpiresBefore } })
        : Promise.resolve(0),
    ]);
    const {
      notificationMembers = [],
      requestedMembers: allRequestedMembers = [],
      ...visibleGroup
    } = group;
    return res.json({
      group: {
        ...visibleGroup,
        memberCount: activeMembers,
        isMember,
        isOwner,
        isRequested,
        pendingPostCount,
        joinRequestCount: group.owner?._id?.toString() === req.user._id.toString() ? allRequestedMembers.length : 0,
        requestedMembers: group.owner?._id?.toString() === req.user._id.toString() ? allRequestedMembers : [],
        pinnedPostIds: (group.pinnedPosts || []).map(String),
        notificationsEnabled: notificationMembers.some((id) => id.toString() === req.user._id.toString()),
        postCount,
        posts: posts.map((post) => ({
          ...post,
          likes: (post.likes || []).map(String),
          repostCount: repostCountByPostId.get(post._id.toString()) || 0,
        })),
      },
      currentUserId: req.user._id,
    });
  } catch (error) {
    return respondError(res, error, "Failed to load group");
  }
};

export const getGroupManagement = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId)
      .populate("owner", `${groupOwnerFields} location`)
      .populate("members", `${userFields} location experience education`)
      .populate("requestedMembers", `${userFields} location experience education`)
      .populate("admins", `${userFields} location experience education`)
      .populate("invitedMembers", userFields)
      .populate("blockedMembers", userFields)
      .lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group owner can manage this group" });
    }

    const pendingExpiresBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const analyticsDays = [14, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 14;
    const analyticsStart = new Date();
    analyticsStart.setHours(0, 0, 0, 0);
    analyticsStart.setDate(analyticsStart.getDate() - (analyticsDays - 1));
    await Post.updateMany(
      { group: group._id, groupPostStatus: "pending", createdAt: { $lt: pendingExpiresBefore } },
      { $set: { groupPostStatus: "rejected" } },
    );
    const [posts, totals, analyticsPosts, membershipEvents] = await Promise.all([
      Post.find({ group: group._id, groupPostStatus: "pending", createdAt: { $gte: pendingExpiresBefore } })
        .populate("author", userFields)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Post.aggregate([
        { $match: { group: group._id, groupPostStatus: "approved" } },
        {
          $group: {
            _id: null,
            posts: { $sum: 1 },
            impressions: { $sum: "$impressions" },
            likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
            comments: { $sum: "$commentsCount" },
          },
        },
      ]),
      Post.find({ group: group._id, groupPostStatus: "approved", createdAt: { $gte: analyticsStart } })
        .populate("author", userFields)
        .select("author createdAt impressions commentsCount likes reactions text")
        .sort({ createdAt: 1 })
        .limit(1000)
        .lean(),
      Promise.resolve((group.membershipEvents || []).filter((event) => event.date >= analyticsStart)),
    ]);
    return res.json({
      group: {
        _id: group._id,
        name: group.name,
        image: group.image,
        coverImage: group.coverImage,
        owner: group.owner,
        members: group.members || [],
        requestedMembers: group.requestedMembers || [],
        admins: group.admins || [],
        invitedMembers: group.invitedMembers || [],
        blockedMembers: group.blockedMembers || [],
        welcomeNote: group.welcomeNote || "",
        welcomeNoteEnabled: Boolean(group.welcomeNoteEnabled),
        joinApprovalMode: group.joinApprovalMode || "approval",
        contentReviewMode: group.requirePostApproval ? "all" : group.contentReviewMode || "none",
        contentReviewCriteria: group.contentReviewCriteria || { images: false, videos: false, links: false },
        createdAt: group.createdAt,
      },
      posts,
      analytics: {
        members: group.members?.length || 0,
        pendingRequests: group.requestedMembers?.length || 0,
        days: analyticsDays,
        postsInRange: analyticsPosts,
        membershipEvents,
        ...(totals[0] || { posts: 0, impressions: 0, likes: 0, comments: 0 }),
      },
    });
  } catch (error) {
    return respondError(res, error, "Failed to load group management");
  }
};

export const getGroupPostAnalytics = async (req, res) => {
  try {
    if (!validId(req.params.groupId) || !validId(req.params.postId)) {
      throw idError("Invalid group or post ID");
    }
    const post = await Post.findOne({
      _id: req.params.postId,
      group: req.params.groupId,
      groupPostStatus: "approved",
    })
      .populate("author", `${userFields} publicProfileSlug`)
      .populate({ path: "repostOf", populate: { path: "author", select: userFields } })
      .lean();
    if (!post) return res.status(404).json({ message: "Group post not found" });
    if (post.author?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only view analytics for your own posts" });
    }
    const [saves, reposts, comments] = await Promise.all([
      User.countDocuments({ savedPosts: post._id }),
      Post.countDocuments({ repostOf: post._id }),
      Comment.countDocuments({ post: post._id }),
    ]);
    const postContent = post.repostOf || post;
    const pollVotes = (postContent.poll?.options || []).reduce(
      (total, option) => total + (option.votes?.length || 0),
      0,
    );
    return res.json({
      post,
      metrics: {
        impressions: Number(post.impressions || 0),
        reactions: (post.likes || []).length + (post.reactions || []).length,
        comments,
        reposts,
        saves,
        pollVotes: postContent.poll?.question ? pollVotes : null,
        pollEndsAt: postContent.poll?.expiresAt || null,
        videoViews: postContent.video?.url ? Number(post.impressions || 0) : null,
        videoWatchMinutes: null,
        profileViewers: null,
        followersGained: null,
        membersReached: null,
        sends: null,
      },
    });
  } catch (error) {
    return respondError(res, error, "Failed to load post analytics");
  }
};

export const updateGroupManagement = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group owner can manage this group" });
    }
    const { action, userId } = req.body;
    let newlyInvitedMember = null;
    if (action === "welcome-note") {
      if (typeof req.body.note !== "string" || req.body.note.trim().length > 1000) {
        throw idError("Welcome note must be 1000 characters or fewer");
      }
      group.welcomeNote = req.body.note.trim();
      group.welcomeNoteEnabled = Boolean(req.body.enabled);
    } else if (action === "join-approval") {
      if (!["open", "criteria", "approval"].includes(req.body.mode)) {
        throw idError("Choose a valid member approval setting");
      }
      group.joinApprovalMode = req.body.mode;
    } else if (action === "content-review") {
      if (!["all", "criteria", "none"].includes(req.body.mode)) {
        throw idError("Choose a valid post review setting");
      }
      const criteria = req.body.criteria || {};
      if (typeof criteria !== "object" || Array.isArray(criteria)) {
        throw idError("Choose valid post review criteria");
      }
      for (const field of ["images", "videos", "links"]) {
        if (field in criteria && typeof criteria[field] !== "boolean") {
          throw idError("Post review criteria must be enabled or disabled");
        }
      }
      if (req.body.mode === "criteria" && !["images", "videos", "links"].some((field) => criteria[field] === true)) {
        throw idError("Select at least one post type to review");
      }
      group.contentReviewMode = req.body.mode;
      group.contentReviewCriteria = {
        images: Boolean(criteria.images),
        videos: Boolean(criteria.videos),
        links: Boolean(criteria.links),
      };
      group.requirePostApproval = req.body.mode === "all";
    } else {
      if (!validId(userId)) throw idError("Choose a valid member");
      const targetId = userId.toString();
      if (targetId === group.owner.toString()) throw idError("The group owner cannot be changed");
      if (action === "approve-request" || action === "decline-request") {
        if (!group.requestedMembers.some((id) => id.toString() === targetId)) {
          return res.status(404).json({ message: "Join request not found" });
        }
        group.requestedMembers = group.requestedMembers.filter((id) => id.toString() !== targetId);
        if (action === "approve-request" && !group.blockedMembers.some((id) => id.toString() === targetId)) {
          if (!group.members.some((id) => id.toString() === targetId)) {
            group.members.addToSet(userId);
            group.membershipEvents.push({ user: userId, action: "joined", date: new Date() });
          }
        }
      } else if (action === "invite") {
        if (group.blockedMembers.some((id) => id.toString() === targetId)) throw idError("Unblock this person before inviting them");
        const invitee = await User.findById(targetId).select("dataPrivacyPreferences.allowNetworkInvitations");
        if (!invitee) return res.status(404).json({ message: "Member not found" });
        if (invitee.dataPrivacyPreferences?.allowNetworkInvitations === false) {
          return res.status(403).json({ message: "This member does not accept group invitations" });
        }
        if (!group.members.some((id) => id.toString() === targetId)) {
          const alreadyInvited = group.invitedMembers.some((id) => id.toString() === targetId);
          group.invitedMembers.addToSet(userId);
          if (!alreadyInvited) newlyInvitedMember = invitee._id;
        }
      } else if (action === "cancel-invite") {
        group.invitedMembers = group.invitedMembers.filter((id) => id.toString() !== targetId);
      } else if (action === "make-admin") {
        if (!group.members.some((id) => id.toString() === targetId)) throw idError("Only group members can be admins");
        group.admins.addToSet(userId);
      } else if (action === "remove-admin") {
        group.admins = group.admins.filter((id) => id.toString() !== targetId);
      } else if (action === "make-owner") {
        if (!group.members.some((id) => id.toString() === targetId)) throw idError("Only group members can become the owner");
        const previousOwnerId = group.owner;
        group.owner = userId;
        group.admins = group.admins.filter((id) => id.toString() !== targetId);
        if (previousOwnerId.toString() !== targetId) group.admins.addToSet(previousOwnerId);
      } else if (action === "remove-member") {
        group.members = group.members.filter((id) => id.toString() !== targetId);
        group.admins = group.admins.filter((id) => id.toString() !== targetId);
        group.membershipEvents.push({ user: userId, action: "left", date: new Date() });
      } else if (action === "block-member") {
        const wasMember = group.members.some((id) => id.toString() === targetId);
        group.members = group.members.filter((id) => id.toString() !== targetId);
        group.admins = group.admins.filter((id) => id.toString() !== targetId);
        if (wasMember) group.membershipEvents.push({ user: userId, action: "left", date: new Date() });
        group.requestedMembers = group.requestedMembers.filter((id) => id.toString() !== targetId);
        group.invitedMembers = group.invitedMembers.filter((id) => id.toString() !== targetId);
        group.blockedMembers.addToSet(userId);
      } else if (action === "unblock-member") {
        group.blockedMembers = group.blockedMembers.filter((id) => id.toString() !== targetId);
      } else {
        throw idError("Choose a valid group management action");
      }
    }
    await group.save();
    if (newlyInvitedMember) {
      await createNotification({
        recipient: newlyInvitedMember,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.GROUP_INVITATION,
        group: group._id,
        details: `${req.user.name} invited you to join ${group.name}.`,
      });
    }
    return res.json({ updated: true });
  } catch (error) {
    return respondError(res, error, "Failed to update group management");
  }
};

export const updateGroup = async (req, res) => {
  const uploadedAssets = [];
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group owner can update group settings" });
    }
    if ("name" in req.body) group.name = text(req.body.name, "Name", 120, true);
    if ("description" in req.body) group.description = text(req.body.description, "Description", 2000, true);
    if ("category" in req.body) group.category = text(req.body.category, "Category", 80);
    if ("location" in req.body) group.location = text(req.body.location, "Location", 200);
    if ("rules" in req.body) group.rules = text(req.body.rules, "Rules", 2000);
    if ("privacy" in req.body) {
      if (!["public", "private"].includes(req.body.privacy)) throw idError("Choose a valid privacy setting");
      group.privacy = req.body.privacy;
      group.joinApprovalMode = req.body.privacy === "private" ? "approval" : "open";
    }
    for (const field of ["allowMemberInvites", "requirePostApproval", "showInSearch"]) {
      if (field in req.body) {
        if (!["true", "false", true, false].includes(req.body[field])) {
          throw idError(`Choose a valid ${field === "allowMemberInvites" ? "member invite" : field === "requirePostApproval" ? "post approval" : "discoverability"} setting`);
        }
        group[field] = req.body[field] === true || req.body[field] === "true";
        if (field === "requirePostApproval") {
          group.contentReviewMode = group.requirePostApproval ? "all" : "none";
        }
      }
    }
    const imageFile = req.files?.image?.[0];
    const coverImageFile = req.files?.coverImage?.[0];
    for (const [file, label] of [[imageFile, "Group image"], [coverImageFile, "Group cover image"]]) {
      if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        throw idError(`${label} must be JPG, PNG, or WEBP`);
      }
    }
    const previousAssets = [];
    if (imageFile) {
      const uploaded = await uploadBufferToCloudinary(imageFile, {
        folder: "careerlink/group-images",
        resource_type: "image",
      });
      uploadedAssets.push(uploaded.public_id);
      previousAssets.push(group.image?.publicId);
      group.image = { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
    }
    if (coverImageFile) {
      const uploaded = await uploadBufferToCloudinary(coverImageFile, {
        folder: "careerlink/group-covers",
        resource_type: "image",
      });
      uploadedAssets.push(uploaded.public_id);
      previousAssets.push(group.coverImage?.publicId);
      group.coverImage = { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
    }
    await group.save();
    await Promise.all(previousAssets.filter(Boolean).map((publicId) => destroyCloudinaryAsset(publicId)));
    const updated = await Group.findById(group._id)
      .populate("owner", groupOwnerFields)
      .populate("members", userFields)
      .populate("requestedMembers", userFields)
      .lean();
    return res.json({ group: { ...updated, memberCount: updated.members.length, isMember: true, isOwner: true } });
  } catch (error) {
    await Promise.all(uploadedAssets.filter(Boolean).map((publicId) => destroyCloudinaryAsset(publicId)));
    return respondError(res, error, "Failed to update group");
  }
};

export const reviewGroupPost = async (req, res) => {
  try {
    if (!validId(req.params.groupId) || !validId(req.params.postId)) throw idError("Invalid group or post ID");
    if (!["approve", "reject"].includes(req.body.action)) throw idError("Choose approve or reject");
    const group = await Group.findById(req.params.groupId).select("owner");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group owner can review posts" });
    }
    const post = await Post.findOne({
      _id: req.params.postId,
      group: group._id,
      groupPostStatus: "pending",
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    });
    if (!post) return res.status(404).json({ message: "Pending group post not found" });
    if (req.body.action === "reject") {
      post.groupPostStatus = "rejected";
      await post.save();
      return res.json({ reviewed: true, approved: false, postId: post._id });
    }
    post.groupPostStatus = "approved";
    await post.save();
    const [groupDetails, groupMembers] = await Promise.all([
      Group.findById(group._id).select("notificationMembers"),
      Post.findById(post._id).populate("author", "_id"),
    ]);
    if (groupDetails?.notificationMembers?.length) {
      await Promise.all(groupDetails.notificationMembers
        .filter((recipient) => recipient.toString() !== groupMembers.author._id.toString())
        .map((recipient) => createNotification({
          recipient,
          sender: groupMembers.author._id,
          type: NOTIFICATION_TYPES.GROUP_POST,
          post: post._id,
          group: group._id,
        })));
    }
    await notifyProfileMentions({ text: post.text, sender: groupMembers.author._id, post: post._id });
    return res.json({ reviewed: true, approved: true, postId: post._id });
  } catch (error) {
    return respondError(res, error, "Failed to review group post");
  }
};

export const toggleGroupMembership = async (req, res) => {
  try {
    if (!validId(req.params.groupId)) throw idError("Invalid group ID");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const userId = req.user._id.toString();
    if (group.blockedMembers?.some((member) => member.toString() === userId)) {
      return res.status(403).json({ message: "You are blocked from this group" });
    }
    const isMember = group.members.some((member) => member.toString() === userId);
    if (isMember && group.owner.toString() === userId) return res.status(400).json({ message: "Group owners cannot leave their group" });
    const approvalMode = group.joinApprovalMode || (group.privacy === "private" ? "approval" : "open");
    if (!isMember && (approvalMode === "approval"
      || (approvalMode === "criteria" && !await meetsGroupJoinCriteria(req.user._id)))) {
      if (group.requestedMembers.some((member) => member.toString() === userId)) {
        group.requestedMembers = group.requestedMembers.filter((member) => member.toString() !== userId);
        await group.save();
        return res.json({ joined: false, requested: false, memberCount: group.members.length });
      }
      group.requestedMembers.push(req.user._id);
      await group.save();
      return res.json({ joined: false, requested: true, memberCount: group.members.length });
    }
    group.members = isMember ? group.members.filter((member) => member.toString() !== userId) : [...group.members, req.user._id];
    group.membershipEvents.push({ user: req.user._id, action: isMember ? "left" : "joined", date: new Date() });
    await group.save();
    res.json({ joined: !isMember, memberCount: group.members.length });
  } catch (error) { respondError(res, error, "Failed to update group membership"); }
};

const meetsGroupJoinCriteria = async (userId) => {
  const user = await User.findById(userId).select("headline location").lean();
  return Boolean(user?.headline?.trim() && user?.location?.trim());
};

export const reviewGroupJoinRequest = async (req, res) => {
  try {
    if (!validId(req.params.groupId) || !validId(req.params.userId)) throw idError("Invalid group or user ID");
    if (!["approve", "decline"].includes(req.body.action)) throw idError("Choose approve or decline");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Only the group owner can manage join requests" });
    const requestExists = group.requestedMembers.some((member) => member.toString() === req.params.userId);
    if (!requestExists) return res.status(404).json({ message: "Join request not found" });
    group.requestedMembers = group.requestedMembers.filter((member) => member.toString() !== req.params.userId);
    if (req.body.action === "approve" && !group.members.some((member) => member.toString() === req.params.userId)) {
      group.members.push(req.params.userId);
      group.membershipEvents.push({ user: req.params.userId, action: "joined", date: new Date() });
    }
    await group.save();
    return res.json({ memberCount: group.members.length, joinRequestCount: group.requestedMembers.length });
  } catch (error) {
    return respondError(res, error, "Failed to update join request");
  }
};

export const toggleGroupPostPin = async (req, res) => {
  try {
    if (!validId(req.params.groupId) || !validId(req.params.postId)) throw idError("Invalid group or post ID");
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Only the group owner can pin posts" });
    const post = await Post.findOne({ _id: req.params.postId, group: group._id });
    if (!post) return res.status(404).json({ message: "Group post not found" });
    const alreadyPinned = group.pinnedPosts.some((id) => id.toString() === post._id.toString());
    group.pinnedPosts = alreadyPinned
      ? group.pinnedPosts.filter((id) => id.toString() !== post._id.toString())
      : [post._id, ...group.pinnedPosts.filter((id) => id.toString() !== post._id.toString())].slice(0, 1);
    await group.save();
    return res.json({ pinned: !alreadyPinned, pinnedPostIds: group.pinnedPosts.map(String) });
  } catch (error) {
    return respondError(res, error, "Failed to pin group post");
  }
};

export const listEvents = async (req, res) => {
  try {
    const search = text(req.query.search || "", "Search", 80);
    const filter = {
      $or: [
        { startsAt: { $gte: new Date() } },
        { organizer: req.user._id, startsAt: { $lt: new Date() } },
      ],
    };
    if (search) filter.$text = { $search: search };
    const events = await populate(Event.find(filter).sort({ startsAt: 1, createdAt: -1 }).limit(50), [
      { path: "organizer", select: userFields },
      { path: "attendees", select: userFields },
      { path: "speakers", select: userFields },
    ]);
    res.json({ events: events.map((event) => ({
      ...event.toObject(),
      attendeeCount: event.attendees.length,
      isAttending: event.attendees.some((person) => person._id.equals(req.user._id)),
      isOrganizer: event.organizer._id.equals(req.user._id),
    })) });
  } catch (error) { respondError(res, error, "Failed to load events"); }
};

export const createEvent = async (req, res) => {
  const uploadedAssets = [];
  try {
    const startsAt = new Date(req.body.startsAt);
    const endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) throw idError("Event dates are invalid");
    if (startsAt < new Date()) throw idError("Events must be scheduled in the future");
    const isOnline = req.body.eventType ? req.body.eventType === "online" : Boolean(req.body.isOnline);
    if (!["online", "in-person"].includes(req.body.eventType || (isOnline ? "online" : "in-person"))) throw idError("Choose a valid event type");
    const timezone = text(req.body.timezone || "UTC", "Timezone", 80);
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw idError("Choose a valid timezone"); }
    const externalLink = text(req.body.externalLink || req.body.meetingUrl || "", "Event link", 1024);
    const location = text(req.body.location || "", "Location", 200);
    if (isOnline && !externalLink) throw idError("Add an external event link");
    if (!isOnline && !location) throw idError("Add an event location");
    if (externalLink) {
      let parsedLink;
      try { parsedLink = new URL(externalLink); } catch { throw idError("Enter a valid event link"); }
      if (!["http:", "https:"].includes(parsedLink.protocol)) throw idError("Event links must start with http:// or https://");
    }
    const imageFile = req.file;
    if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.mimetype)) {
      throw idError("Event cover must be JPG, PNG, or WEBP");
    }
    let coverImage = { url: "", publicId: "" };
    if (imageFile) {
      const uploaded = await uploadBufferToCloudinary(imageFile, {
        folder: "careerlink/event-covers",
        resource_type: "image",
      });
      uploadedAssets.push(uploaded.public_id);
      coverImage = { url: uploaded.secure_url, publicId: uploaded.public_id || "" };
    }
    let speakerIds = req.body.speakers || [];
    if (typeof speakerIds === "string") {
      try { speakerIds = JSON.parse(speakerIds); } catch { throw idError("Choose valid event speakers"); }
    }
    if (!Array.isArray(speakerIds)) throw idError("Choose valid event speakers");
    if (speakerIds.some((id) => !validId(id))) throw idError("Choose valid event speakers");
    speakerIds = [...new Set(speakerIds.map(String))];
    if (speakerIds.length && await User.countDocuments({ _id: { $in: speakerIds } }) !== speakerIds.length) {
      throw idError("Choose valid event speakers");
    }
    const event = await Event.create({
      title: text(req.body.title, "Event name", 75, true),
      description: text(req.body.description || "", "Description", 5000),
      startsAt,
      endsAt,
      timezone,
      coverImage,
      eventType: isOnline ? "online" : "in-person",
      isOnline,
      location,
      meetingUrl: externalLink,
      externalLink,
      speakers: speakerIds,
      organizer: req.user._id,
      attendees: [],
    });
    await notifyEventUsers({
      recipients: speakerIds,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.EVENT_SPEAKER_INVITATION,
      event: event._id,
      details: `You were invited to speak at ${event.title}.`,
    });
    res.status(201).json({ event: await populate(Event.findById(event._id), [
      { path: "organizer", select: userFields },
      { path: "attendees", select: userFields },
      { path: "speakers", select: userFields },
    ]) });
  } catch (error) {
    await Promise.all(uploadedAssets.map((publicId) => destroyCloudinaryAsset(publicId)));
    respondError(res, error, "Failed to create event");
  }
};

export const getEvent = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId)
      .populate("organizer", `${userFields} coverPicture`)
      .populate("attendees", userFields)
      .populate("speakers", userFields)
      .populate("invitedMembers", userFields)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields);
    if (!event) return res.status(404).json({ message: "Event not found" });
    event.pageVisits += 1;
    await event.save();
    const eventObject = event.toObject();
    const isOrganizer = event.organizer._id.equals(req.user._id);
    res.json({
      event: {
        ...eventObject,
        invitedMembers: isOrganizer ? eventObject.invitedMembers : [],
        pageVisits: isOrganizer ? event.pageVisits : undefined,
        attendeeCount: event.attendees.length,
        isAttending: event.attendees.some((person) => person._id.equals(req.user._id)),
        isOrganizer,
      },
      currentUserId: req.user._id,
    });
  } catch (error) { respondError(res, error, "Failed to load event"); }
};

export const getEventPostAnalytics = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId).populate("organizer", userFields).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer?._id.equals(req.user._id)) {
      return res.status(403).json({ message: "Only the event organizer can view post analytics" });
    }

    const posts = await Post.find({ event: event._id, author: req.user._id })
      .populate("author", userFields)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const postIds = posts.map((post) => post._id);
    const [reposts, comments, savedCounts] = postIds.length
      ? await Promise.all([
        Post.aggregate([
          { $match: { repostOf: { $in: postIds } } },
          { $group: { _id: "$repostOf", count: { $sum: 1 } } },
        ]),
        Comment.aggregate([
          { $match: { post: { $in: postIds } } },
          { $group: { _id: "$post", count: { $sum: 1 } } },
        ]),
        User.aggregate([
          { $match: { savedPosts: { $in: postIds } } },
          { $unwind: "$savedPosts" },
          { $match: { savedPosts: { $in: postIds } } },
          { $group: { _id: "$savedPosts", count: { $sum: 1 } } },
        ]),
      ])
      : [[], [], []];
    const countMap = (items) => new Map(items.map((item) => [item._id.toString(), item.count]));
    const repostCounts = countMap(reposts);
    const commentCounts = countMap(comments);
    const saveCounts = countMap(savedCounts);

    return res.json({
      event: {
        _id: event._id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        timezone: event.timezone,
        isOnline: event.isOnline,
        location: event.location,
        coverImage: event.coverImage,
        pageVisits: event.pageVisits || 0,
        attendeeCount: event.attendees?.length || 0,
      },
      posts: posts.map((post) => ({
        ...post,
        metrics: {
          impressions: Number(post.impressions || 0),
          reactions: (post.likes?.length || 0) + (post.reactions?.length || 0),
          comments: commentCounts.get(post._id.toString()) || 0,
          reposts: repostCounts.get(post._id.toString()) || 0,
          saves: saveCounts.get(post._id.toString()) || 0,
          membersReached: null,
          inNetworkPercent: null,
          outOfNetworkPercent: null,
          profileViewers: null,
          followersGained: null,
          sends: null,
          videoViews: null,
          videoWatchMinutes: null,
        },
      })),
    });
  } catch (error) {
    return respondError(res, error, "Failed to load event post analytics");
  }
};

export const updateEvent = async (req, res) => {
  let uploadedAsset;
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can update this event" });
    const previousEvent = {
      title: event.title,
      description: event.description,
      startsAt: event.startsAt?.getTime(),
      endsAt: event.endsAt?.getTime() || null,
      timezone: event.timezone,
      eventType: event.eventType,
      location: event.location,
      externalLink: event.externalLink,
      speakers: event.speakers.map((speaker) => speaker.toString()),
    };
    if ("title" in req.body) event.title = text(req.body.title, "Event name", 75, true);
    if ("description" in req.body) event.description = text(req.body.description, "Description", 5000);
    if ("startsAt" in req.body) event.startsAt = new Date(req.body.startsAt);
    if ("endsAt" in req.body) event.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
    if (Number.isNaN(event.startsAt.getTime()) || (event.endsAt && (Number.isNaN(event.endsAt.getTime()) || event.endsAt <= event.startsAt))) {
      throw idError("Event dates are invalid");
    }
    if ("timezone" in req.body) {
      const timezone = text(req.body.timezone, "Timezone", 80, true);
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw idError("Choose a valid timezone"); }
      event.timezone = timezone;
    }
    if ("eventType" in req.body) {
      if (!["online", "in-person"].includes(req.body.eventType)) throw idError("Choose a valid event type");
      event.eventType = req.body.eventType;
      event.isOnline = req.body.eventType === "online";
    }
    if ("location" in req.body) event.location = text(req.body.location, "Location", 200);
    if ("externalLink" in req.body) {
      event.externalLink = text(req.body.externalLink, "Event link", 1024);
      event.meetingUrl = event.externalLink;
    }
    if ("speakers" in req.body) {
      let speakerIds = req.body.speakers;
      if (typeof speakerIds === "string") {
        try { speakerIds = JSON.parse(speakerIds); } catch { throw idError("Choose valid event speakers"); }
      }
      if (!Array.isArray(speakerIds) || speakerIds.some((id) => !validId(id))) throw idError("Choose valid event speakers");
      speakerIds = [...new Set(speakerIds.map(String))];
      if (speakerIds.length && await User.countDocuments({ _id: { $in: speakerIds } }) !== speakerIds.length) {
        throw idError("Choose valid event speakers");
      }
      event.speakers = speakerIds;
    }
    if (event.isOnline && !event.externalLink) throw idError("Add an external event link");
    if (!event.isOnline && !event.location) throw idError("Add an event location");
    if (event.externalLink) {
      let parsedLink;
      try { parsedLink = new URL(event.externalLink); } catch { throw idError("Enter a valid event link"); }
      if (!["http:", "https:"].includes(parsedLink.protocol)) throw idError("Event links must start with http:// or https://");
    }
    const newlyAddedSpeakers = event.speakers
      .map((speaker) => speaker.toString())
      .filter((speaker) => !previousEvent.speakers.includes(speaker));
    const eventDetailsChanged = previousEvent.title !== event.title
      || previousEvent.description !== event.description
      || previousEvent.startsAt !== event.startsAt.getTime()
      || previousEvent.endsAt !== (event.endsAt?.getTime() || null)
      || previousEvent.timezone !== event.timezone
      || previousEvent.eventType !== event.eventType
      || previousEvent.location !== event.location
      || previousEvent.externalLink !== event.externalLink;
    if (req.file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) throw idError("Event cover must be JPG, PNG, or WEBP");
      if (req.file.size > 10 * 1024 * 1024) throw idError("Event cover must be 10 MB or smaller");
      uploadedAsset = await uploadBufferToCloudinary(req.file, {
        folder: "careerlink/event-covers",
        resource_type: "image",
      });
      const previousCoverId = event.coverImage?.publicId;
      event.coverImage = { url: uploadedAsset.secure_url, publicId: uploadedAsset.public_id || "" };
      await event.save();
      await destroyCloudinaryAsset(previousCoverId);
      uploadedAsset = null;
    } else {
      await event.save();
    }
    await Promise.all([
      notifyEventUsers({
        recipients: newlyAddedSpeakers,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.EVENT_SPEAKER_INVITATION,
        event: event._id,
        details: `You were invited to speak at ${event.title}.`,
      }),
      eventDetailsChanged
        ? notifyEventUsers({
          recipients: event.attendees,
          sender: req.user._id,
          type: NOTIFICATION_TYPES.EVENT_ATTENDEE_UPDATE,
          event: event._id,
          details: `${event.title} has been updated by the organizer.`,
        })
        : Promise.resolve(),
    ]);
    const updated = await Event.findById(event._id)
      .populate("organizer", userFields)
      .populate("attendees", userFields)
      .populate("speakers", userFields);
    return res.json({ event: updated });
  } catch (error) {
    if (uploadedAsset?.public_id) await destroyCloudinaryAsset(uploadedAsset.public_id);
    return respondError(res, error, "Failed to update event");
  }
};

export const cancelEvent = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can cancel this event" });
    if (event.cancelledAt) return res.status(400).json({ message: "This event has already been cancelled" });
    event.cancelledAt = new Date();
    event.commentsDisabled = true;
    await event.save();
    await notifyEventUsers({
      recipients: [...event.attendees, ...event.invitedMembers],
      sender: req.user._id,
      type: NOTIFICATION_TYPES.EVENT_ATTENDEE_UPDATE,
      event: event._id,
      details: `${event.title} has been cancelled by the organizer.`,
    });
    const updated = await Event.findById(event._id)
      .populate("organizer", userFields)
      .populate("attendees", userFields)
      .populate("speakers", userFields);
    return res.json({ event: updated });
  } catch (error) {
    return respondError(res, error, "Failed to cancel event");
  }
};

export const reportEvent = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const reasons = ["spam", "harassment", "misinformation", "inappropriate", "other"];
    if (!reasons.includes(req.body.reason)) throw idError("Choose a valid report reason");
    const details = text(req.body.details || "", "Report details", 1000);
    const event = await Event.findById(req.params.eventId).select("organizer");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.organizer.equals(req.user._id)) throw idError("You cannot report your own event");
    await EventReport.create({ event: event._id, reporter: req.user._id, reason: req.body.reason, details });
    return res.status(201).json({ message: "Event report submitted for review" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reported this event" });
    return respondError(res, error, "Unable to submit event report");
  }
};

export const deleteEvent = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can delete this event" });
    await event.deleteOne();
    await Promise.all([
      destroyCloudinaryAsset(event.coverImage?.publicId),
      ...event.comments.map((comment) => destroyCloudinaryAsset(comment.image?.publicId)),
    ]);
    res.json({ deleted: true });
  } catch (error) { respondError(res, error, "Failed to delete event"); }
};

export const updateEventAttendees = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.userId)) throw idError("Invalid event or user ID");
    if (!["invite", "uninvite", "remove-attendee"].includes(req.body.action)) throw idError("Choose a valid invitation action");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can manage attendees" });
    const userId = req.params.userId;
    if (req.body.action === "invite") {
      const invitee = await User.findById(userId).select("dataPrivacyPreferences.allowNetworkInvitations");
      if (!invitee) return res.status(404).json({ message: "User not found" });
      if (invitee.dataPrivacyPreferences?.allowNetworkInvitations === false) {
        return res.status(403).json({ message: "This member does not accept event invitations" });
      }
    }
    const isNewInvitation = req.body.action === "invite"
      && !event.invitedMembers.some((id) => id.toString() === userId);
    if (req.body.action === "invite") event.invitedMembers.addToSet(userId);
    else if (req.body.action === "uninvite") event.invitedMembers = event.invitedMembers.filter((id) => id.toString() !== userId);
    else if (userId !== event.organizer.toString()) event.attendees = event.attendees.filter((id) => id.toString() !== userId);
    await event.save();
    if (isNewInvitation) {
      await createNotification({
        recipient: userId,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.EVENT_INVITATION,
        event: event._id,
        details: `${req.user.name} invited you to ${event.title}.`,
      });
    }
    res.json({ invited: req.body.action === "invite" });
  } catch (error) { respondError(res, error, "Failed to update event invitations"); }
};

export const addEventComment = async (req, res) => {
  let uploadedAsset;
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.commentsDisabled) return res.status(403).json({ message: "Comments are turned off for this event" });
    const commentText = text(req.body.text || "", "Comment", 1000);
    const gifUrl = text(req.body.gifUrl || "", "GIF link", 1024);
    if (gifUrl) {
      let parsedUrl;
      try { parsedUrl = new URL(gifUrl); } catch { throw idError("Enter a valid GIF link"); }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw idError("GIF links must start with http:// or https://");
    }
    if (req.file && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(req.file.mimetype)) {
      throw idError("Comment image must be JPG, PNG, WEBP, or GIF");
    }
    if (req.file?.size > 10 * 1024 * 1024) throw idError("Comment image must be 10 MB or smaller");
    if (!commentText && !req.file && !gifUrl) throw idError("Add text, an image, or a GIF");
    let image = { url: "", publicId: "" };
    if (req.file) {
      uploadedAsset = await uploadBufferToCloudinary(req.file, {
        folder: "careerlink/event-comments",
        resource_type: "image",
      });
      image = { url: uploadedAsset.secure_url, publicId: uploadedAsset.public_id || "" };
    }
    const comment = { author: req.user._id, text: commentText, image, gifUrl, createdAt: new Date() };
    event.comments.push(comment);
    await event.save();
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    res.status(201).json({ comments: updated.comments });
  } catch (error) {
    if (uploadedAsset?.public_id) await destroyCloudinaryAsset(uploadedAsset.public_id);
    respondError(res, error, "Failed to add event comment");
  }
};

export const updateEventComment = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) {
      throw idError("Invalid event or comment ID");
    }
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const isOrganizer = event.organizer.equals(req.user._id);
    const isAuthor = comment.author.equals(req.user._id);
    if (!isOrganizer && !isAuthor) {
      return res.status(403).json({ message: "You can only edit your own comments" });
    }
    comment.text = text(req.body.text, "Comment", 1000, true);
    await event.save();
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    return res.json({ comments: updated.comments });
  } catch (error) {
    return respondError(res, error, "Failed to update event comment");
  }
};

export const deleteEventComment = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) {
      throw idError("Invalid event or comment ID");
    }
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const isOrganizer = event.organizer.equals(req.user._id);
    const isAuthor = comment.author.equals(req.user._id);
    if (!isOrganizer && !isAuthor) {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }
    const imagePublicId = comment.image?.publicId;
    comment.deleteOne();
    await event.save();
    await destroyCloudinaryAsset(imagePublicId);
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    return res.json({ comments: updated.comments });
  } catch (error) {
    return respondError(res, error, "Failed to delete event comment");
  }
};

export const toggleEventCommentLike = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) throw idError("Invalid event or comment ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const userId = req.user._id.toString();
    const liked = comment.likes.some((id) => id.toString() === userId);
    comment.likes = liked ? comment.likes.filter((id) => id.toString() !== userId) : [...comment.likes, req.user._id];
    await event.save();
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    return res.json({ comments: updated.comments, liked: !liked });
  } catch (error) {
    return respondError(res, error, "Failed to update comment reaction");
  }
};

export const toggleEventCommentPin = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) throw idError("Invalid event or comment ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can pin event comments" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const pinned = !comment.pinned;
    event.comments.forEach((item) => { item.pinned = pinned && item._id.equals(comment._id); });
    await event.save();
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    return res.json({ comments: updated.comments, pinned });
  } catch (error) {
    return respondError(res, error, "Failed to pin event comment");
  }
};

export const reportEventComment = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) throw idError("Invalid event or comment ID");
    const reasons = ["spam", "harassment", "misinformation", "inappropriate", "other"];
    if (!reasons.includes(req.body.reason)) throw idError("Choose a valid report reason");
    const details = text(req.body.details || "", "Report details", 1000);
    const event = await Event.findById(req.params.eventId).select("organizer comments._id comments.author");
    if (!event) return res.status(404).json({ message: "Event not found" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.author.equals(req.user._id)) return res.status(403).json({ message: "You cannot report your own comment" });
    await EventCommentReport.create({
      event: event._id,
      comment: req.params.commentId,
      reporter: req.user._id,
      reason: req.body.reason,
      details,
    });
    return res.status(201).json({ message: "Comment report submitted for review" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reported this comment" });
    return respondError(res, error, "Unable to submit comment report");
  }
};

export const addEventCommentReply = async (req, res) => {
  try {
    if (!validId(req.params.eventId) || !validId(req.params.commentId)) throw idError("Invalid event or comment ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.commentsDisabled) return res.status(403).json({ message: "Comments are turned off for this event" });
    const comment = event.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    comment.replies.push({ author: req.user._id, text: text(req.body.text, "Reply", 1000, true), createdAt: new Date() });
    await event.save();
    const updated = await Event.findById(event._id)
      .populate("comments.author", userFields)
      .populate("comments.replies.author", userFields)
      .lean();
    return res.status(201).json({ comments: updated.comments });
  } catch (error) {
    return respondError(res, error, "Failed to add event comment reply");
  }
};

export const updateEventCommentSettings = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    if (typeof req.body.commentsDisabled !== "boolean") throw idError("Choose whether comments are enabled");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.organizer.equals(req.user._id)) return res.status(403).json({ message: "Only the organizer can change comment settings" });
    if (event.cancelledAt && !req.body.commentsDisabled) throw idError("Comments cannot be turned on for a cancelled event");
    event.commentsDisabled = req.body.commentsDisabled;
    await event.save();
    return res.json({ commentsDisabled: event.commentsDisabled });
  } catch (error) {
    return respondError(res, error, "Failed to update event comment settings");
  }
};

export const toggleEventRsvp = async (req, res) => {
  try {
    if (!validId(req.params.eventId)) throw idError("Invalid event ID");
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.cancelledAt) throw idError("This event has been cancelled");
    const userId = req.user._id.toString();
    const attending = event.attendees.some((person) => person.toString() === userId);
    if (!attending && event.startsAt <= new Date()) throw idError("Registration for this event has closed");
    event.attendees = attending ? event.attendees.filter((person) => person.toString() !== userId) : [...event.attendees, req.user._id];
    await event.save();
    await createNotification({
      recipient: event.organizer,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.EVENT_ORGANIZER_UPDATE,
      event: event._id,
      details: `${req.user.name} ${attending ? "is no longer attending" : "is attending"} ${event.title}.`,
    });
    res.json({ attending: !attending, attendeeCount: event.attendees.length });
  } catch (error) { respondError(res, error, "Failed to update RSVP"); }
};

export const listNewsletters = async (req, res) => {
  try {
    const search = text(req.query.search || "", "Search", 80);
    const filter = search ? { $text: { $search: search } } : {};
    const newsletters = await populate(Newsletter.find(filter).sort({ createdAt: -1 }).limit(50), [
      { path: "author", select: userFields },
      { path: "subscribers", select: userFields },
    ]);
    res.json({ newsletters: newsletters.map((newsletter) => ({ ...newsletter.toObject(), subscriberCount: newsletter.subscribers.length, isSubscribed: newsletter.subscribers.some((person) => person._id.equals(req.user._id)) })) });
  } catch (error) { respondError(res, error, "Failed to load newsletters"); }
};

export const createNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.create({
      name: text(req.body.name, "Name", 120, true),
      description: text(req.body.description, "Description", 2000, true),
      category: text(req.body.category || "Career", "Category", 80),
      frequency: ["weekly", "monthly", "occasional"].includes(req.body.frequency) ? req.body.frequency : "weekly",
      author: req.user._id, subscribers: [req.user._id],
    });
    res.status(201).json({ newsletter: await populate(Newsletter.findById(newsletter._id), { path: "author", select: userFields }) });
  } catch (error) { respondError(res, error, "Failed to create newsletter"); }
};

export const toggleNewsletterSubscription = async (req, res) => {
  try {
    if (!validId(req.params.newsletterId)) throw idError("Invalid newsletter ID");
    const newsletter = await Newsletter.findById(req.params.newsletterId);
    if (!newsletter) return res.status(404).json({ message: "Newsletter not found" });
    const userId = req.user._id.toString();
    const subscribed = newsletter.subscribers.some((person) => person.toString() === userId);
    newsletter.subscribers = subscribed ? newsletter.subscribers.filter((person) => person.toString() !== userId) : [...newsletter.subscribers, req.user._id];
    await newsletter.save();
    if (!subscribed && newsletter.author.toString() !== userId) {
      await createNotification({
        recipient: newsletter.author,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        newsletter: newsletter._id,
      });
    }
    res.json({ subscribed: !subscribed, subscriberCount: newsletter.subscribers.length });
  } catch (error) { respondError(res, error, "Failed to update subscription"); }
};
