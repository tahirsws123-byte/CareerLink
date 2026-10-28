import mongoose from "mongoose";
import Post from "../models/Post.js";
import Group from "../models/Group.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Connection, { makeConnectionPairKey } from "../models/Connection.js";
import Comment from "../models/Comment.js";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";
import { createNotification, notifyProfileMentions } from "../utils/notificationUtils.js";
import { recordProfileAnalytics } from "../utils/profileAnalytics.js";
import PostReport from "../models/PostReport.js";
import {
  destroyCloudinaryAsset,
  uploadBufferToCloudinary,
} from "../utils/cloudinaryUpload.js";

const POST_TEXT_MAX_LENGTH = 1000;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const postAuthorFields = "name headline profilePicture publicProfileSlug";
const postHasLink = (text = "") => /https?:\/\/|www\./i.test(text);

const canViewProfileActivity = async (req, profile) => {
  const viewerId = req.user?._id;
  if (viewerId?.toString() === profile._id.toString()) return true;
  if (profile.blockedUsers?.some((id) => id.toString() === viewerId?.toString())) return false;
  if (viewerId && await User.exists({ _id: viewerId, blockedUsers: profile._id })) return false;
  if (!viewerId && (profile.publicProfileEnabled === false || profile.publicProfileFields?.activity === false)) {
    return false;
  }

  let isConnection = false;
  if (viewerId) {
    isConnection = Boolean(await Connection.exists({
      pairKey: makeConnectionPairKey(viewerId, profile._id),
      status: "accepted",
    }));
  }
  const profileVisibility = profile.profileVisibility || "public";
  const activityVisibility = profile.activityVisibility || "public";
  return (profileVisibility === "public" || (profileVisibility === "connections" && isConnection))
    && (activityVisibility === "public" || (activityVisibility === "connections" && isConnection));
};

const needsGroupPostReview = (group, authorId, content = {}) => {
  if (!group || group.owner.toString() === authorId.toString()) return false;
  const mode = group.requirePostApproval ? "all" : group.contentReviewMode || "none";
  if (mode === "all") return true;
  if (mode !== "criteria") return false;
  const criteria = group.contentReviewCriteria || {};
  return Boolean(
    (criteria.images && (content.hasImage || content.image?.url)) ||
    (criteria.videos && (content.hasVideo || content.video?.url)) ||
    (criteria.links && postHasLink(content.text || "")),
  );
};

const emptyMedia = () => ({
  url: "",
  publicId: "",
});

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const cleanPostText = (text) => {
  if (text === undefined || text === null) return "";

  if (typeof text !== "string") {
    throw validationError("Post text must be text");
  }

  const cleaned = text.trim();

  if (cleaned.length > POST_TEXT_MAX_LENGTH) {
    throw validationError(
      `Post text must be ${POST_TEXT_MAX_LENGTH} characters or fewer`,
    );
  }

  return cleaned;
};

const parsePoll = (value) => {
  if (value === undefined || value === null || value === "") return null;
  let poll = value;
  if (typeof value === "string") {
    try {
      poll = JSON.parse(value);
    } catch {
      throw validationError("Poll data is invalid");
    }
  }
  if (!poll || typeof poll !== "object" || Array.isArray(poll)) {
    throw validationError("Poll data is invalid");
  }
  const question = typeof poll.question === "string" ? poll.question.trim() : "";
  const options = Array.isArray(poll.options)
    ? poll.options.map((option) => typeof option === "string" ? option.trim() : "")
    : [];
  const durationDays = Number(poll.durationDays);
  if (!question || question.length > 140) throw validationError("Poll question must be 1 to 140 characters");
  if (options.length < 2 || options.length > 4 || options.some((option) => !option || option.length > 30)) {
    throw validationError("Add 2 to 4 poll options, each up to 30 characters");
  }
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
    throw validationError("Poll options must be unique");
  }
  if (![1, 3, 7, 14].includes(durationDays)) throw validationError("Choose a valid poll duration");
  return {
    question,
    options: options.map((option) => ({ text: option, votes: [] })),
    expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
  };
};

const assertFileType = (file, allowedTypes, message) => {
  if (file && !allowedTypes.has(file.mimetype)) {
    throw validationError(message);
  }
};

const uploadPostMedia = async (file, options) => {
  let uploadResult;
  try {
    uploadResult = await uploadBufferToCloudinary(file, options);
  } catch (error) {
    console.error("Post media upload failed:", error);
    throw Object.assign(
      new Error("Media upload failed. Please try a supported file under 25 MB."),
      { statusCode: 502 },
    );
  }

  if (!uploadResult?.secure_url) {
    if (uploadResult?.public_id) {
      await destroyCloudinaryAsset(
        uploadResult.public_id,
        options.resource_type === "video" ? { resource_type: "video" } : {},
      );
    }
    throw Object.assign(new Error("Media upload failed. Please try again."), { statusCode: 502 });
  }

  return uploadResult;
};

const populatePost = (query) =>
  query.populate("author", postAuthorFields).populate({
    path: "repostOf",
    populate: [
      { path: "author", select: postAuthorFields },
      { path: "group", select: "name image privacy" },
      {
        path: "event",
        populate: [
          { path: "organizer", select: postAuthorFields },
          { path: "attendees", select: postAuthorFields },
        ],
      },
    ],
  }).populate({
    path: "event",
    populate: [
      { path: "organizer", select: postAuthorFields },
      { path: "attendees", select: postAuthorFields },
    ],
  }).populate("group", "name image privacy");

const mediaCleanupItems = (post) => {
  const items = [];

  if (post.image?.publicId) {
    items.push({ publicId: post.image.publicId, options: {} });
  }

  if (post.video?.publicId) {
    items.push({
      publicId: post.video.publicId,
      options: { resource_type: "video" },
    });
  }

  return items;
};

const destroyMediaItems = (items) =>
  Promise.all(
    items.map((item) => destroyCloudinaryAsset(item.publicId, item.options)),
  );

const readableGroupPostFilter = async (userId) => {
  const groups = await Group.find(userId
    ? { $or: [{ privacy: "public" }, { members: userId }] }
    : { privacy: "public" }).select("_id").lean();
  return {
    groupPostStatus: { $nin: ["pending", "rejected"] },
    $or: [
      { group: null },
      { group: { $in: groups.map((group) => group._id) } },
    ],
  };
};

export const createPost = async (req, res) => {
  let uploadedAsset;

  try {
    const text = cleanPostText(req.body.text);
    const poll = parsePoll(req.body.poll);
    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];
    let event = null;
    if (req.body.eventId) {
      if (!mongoose.isValidObjectId(req.body.eventId)) throw validationError("Invalid event");
      event = await Event.findById(req.body.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!event.organizer.equals(req.user._id)) {
        return res.status(403).json({ message: "Only the event organizer can publish its announcement" });
      }
    }

    if (poll && (imageFile || videoFile)) {
      return res.status(400).json({ message: "Polls cannot be combined with a photo or video" });
    }
    if (imageFile && videoFile) {
      return res.status(400).json({
        message: "A post can contain either an image or a video, not both",
      });
    }

    assertFileType(
      imageFile,
      IMAGE_MIME_TYPES,
      "Only JPG, PNG, WEBP, HEIC, and HEIF images are allowed",
    );
    assertFileType(videoFile, VIDEO_MIME_TYPES, "Only MP4, WEBM, and MOV videos are allowed");

    if (!text && !imageFile && !videoFile && !poll && !event) {
      return res.status(400).json({
        message: "Post text, image, or video is required",
      });
    }

    let group = null;
    let requiresGroupPostReview = false;
    if (req.body.groupId) {
      if (!mongoose.isValidObjectId(req.body.groupId)) throw validationError("Invalid group");
      group = await Group.findById(req.body.groupId).select("owner members privacy notificationMembers requirePostApproval contentReviewMode contentReviewCriteria");
      if (!group) return res.status(404).json({ message: "Group not found" });
      const isMember = group.members.some((memberId) => memberId.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: "Join the group before posting" });
      requiresGroupPostReview = needsGroupPostReview(group, req.user._id, {
        text,
        hasImage: Boolean(imageFile),
        hasVideo: Boolean(videoFile),
      });
    }

    let image = emptyMedia();
    let video = emptyMedia();

    if (imageFile) {
      const uploadResult = await uploadPostMedia(imageFile, {
        folder: "careerlink/post-images",
        resource_type: "image",
      });

      uploadedAsset = { publicId: uploadResult.public_id, options: {} };
      image = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    if (videoFile) {
      const uploadResult = await uploadPostMedia(videoFile, {
        folder: "careerlink/post-videos",
        resource_type: "video",
      });

      uploadedAsset = {
        publicId: uploadResult.public_id,
        options: { resource_type: "video" },
      };
      video = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    const post = await Post.create({
      author: req.user._id,
      group: group?._id || null,
      event: event?._id || null,
      text,
      image,
      video,
      poll,
      groupPostStatus: requiresGroupPostReview ? "pending" : "approved",
    });
    if (!requiresGroupPostReview) {
      await notifyProfileMentions({ text, sender: req.user._id, post: post._id });
    }

    const populatedPost = await populatePost(Post.findById(post._id));
    if (!requiresGroupPostReview && group?.notificationMembers?.length) {
      await Promise.all(group.notificationMembers
        .filter((recipient) => recipient.toString() !== req.user._id.toString())
        .map((recipient) => createNotification({
          recipient,
          sender: req.user._id,
          type: NOTIFICATION_TYPES.GROUP_POST,
          post: post._id,
          group: group._id,
        })));
    }
    if (!requiresGroupPostReview && !group && !event) {
      const author = await User.findById(req.user._id).select("followers");
      await Promise.all((author?.followers || [])
        .filter((recipient) => recipient.toString() !== req.user._id.toString())
        .map((recipient) => createNotification({
          recipient,
          sender: req.user._id,
          type: NOTIFICATION_TYPES.FOLLOWED_POST,
          post: post._id,
        })));
    }

    return res.status(201).json(populatedPost);
  } catch (error) {
    await destroyCloudinaryAsset(uploadedAsset?.publicId, uploadedAsset?.options);

    const status = error.statusCode || 500;

    if (status >= 500) {
      console.error("Post creation error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Failed to create post" : error.message,
    });
  }
};

export const voteOnPostPoll = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.body.optionId)) {
      return res.status(400).json({ message: "Invalid poll or option" });
    }
    const post = await Post.findById(req.params.id);
    if (!post?.poll?.question) return res.status(404).json({ message: "Poll not found" });
    if (post.groupPostStatus !== "approved") return res.status(403).json({ message: "This poll is not open for voting" });
    if (post.group) {
      const group = await Group.findById(post.group).select("privacy members");
      if (!group || (group.privacy === "private" && !group.members.some((member) => member.equals(req.user._id)))) {
        return res.status(403).json({ message: "You cannot vote in this group poll" });
      }
    }
    if (post.poll.expiresAt && post.poll.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "This poll has closed" });
    }
    const option = post.poll.options.id(req.body.optionId);
    if (!option) return res.status(404).json({ message: "Poll option not found" });
    const userId = req.user._id.toString();
    post.poll.options.forEach((item) => {
      item.votes = item.votes.filter((voter) => voter.toString() !== userId);
    });
    option.votes.push(req.user._id);
    await post.save();
    return res.json(await populatePost(Post.findById(post._id)));
  } catch (error) {
    console.error("Vote on poll error:", error);
    return res.status(500).json({ message: "Unable to submit poll vote" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const visibleGroups = await Group.find({
      $or: [{ privacy: "public" }, { members: req.user._id }],
    }).select("_id").lean();
    const posts = await populatePost(
      Post.find({
        groupPostStatus: { $nin: ["pending", "rejected"] },
        $or: [
          { group: null },
          { group: { $in: visibleGroups.map((group) => group._id) } },
        ],
      }).sort({ createdAt: -1 }).limit(100),
    );

    const postIds = posts.map((post) => post._id);

    if (postIds.length > 0) {
      await Post.updateMany(
        { _id: { $in: postIds } },
        { $inc: { impressions: 1 } },
      );

      const impressionsByAuthor = new Map();
      posts.forEach((post) => {
        const authorId = post.author?._id?.toString();
        if (authorId) impressionsByAuthor.set(authorId, (impressionsByAuthor.get(authorId) || 0) + 1);
      });

      if (impressionsByAuthor.size) {
        await Promise.all([...impressionsByAuthor].map(async ([authorId, count]) => {
          await User.updateOne({ _id: authorId }, { $inc: { postImpressions: count } });
          await recordProfileAnalytics([authorId], "postImpressions", count);
        }));
      }
    }

    const updatedPosts = await populatePost(
      Post.find({ _id: { $in: postIds }, groupPostStatus: { $nin: ["pending", "rejected"] } }).sort({ createdAt: -1 }),
    );

    return res.status(200).json(updatedPosts);
  } catch (error) {
    console.error("Get posts error:", error);

    return res.status(500).json({ message: "Failed to load posts" });
  }
};

export const getProfilePosts = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const profile = await User.findById(req.params.userId)
      .select("profileVisibility activityVisibility publicProfileEnabled publicProfileFields blockedUsers");
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    if (!(await canViewProfileActivity(req, profile))) {
      return res.status(404).json({ message: "Profile activity not found" });
    }
    const posts = await populatePost(
      Post.find({
        $and: [
          { $or: [{ author: req.params.userId }, { repostedBy: req.params.userId }] },
          await readableGroupPostFilter(req.user?._id),
        ],
      }).sort({ createdAt: -1 }).limit(20),
    );
    return res.status(200).json(posts);
  } catch (error) {
    console.error("Get profile posts error:", error);
    return res.status(500).json({ message: "Failed to load profile activity" });
  }
};

export const getMyActivity = async (req, res) => {
  try {
    const tab = req.query.tab === "reactions" ? "reactions" : "posts";
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 100000);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 30);
    const userId = req.user._id;
    const query = {
      $and: [
        tab === "posts"
          ? { $or: [{ author: userId }, { repostedBy: userId }] }
          : { $or: [{ likes: userId }, { "reactions.user": userId }] },
        await readableGroupPostFilter(userId),
      ],
    };

    const [posts, total] = await Promise.all([
      populatePost(Post.find(query)
        .sort(tab === "posts" ? { createdAt: -1 } : { updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)),
      Post.countDocuments(query),
    ]);
    return res.json({
      posts,
      tab,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Get my activity error:", error);
    return res.status(500).json({ message: "Unable to load your activity" });
  }
};

export const getProfileActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Invalid user ID" });
    const tab = ["posts", "comments", "videos", "images", "events", "reactions"].includes(req.query.tab)
      ? req.query.tab
      : "posts";
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 100000);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 30);
    const profile = await User.findById(userId)
      .select("profileVisibility activityVisibility publicProfileEnabled publicProfileFields blockedUsers");
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    if (!(await canViewProfileActivity(req, profile))) {
      return res.status(404).json({ message: "Profile activity not found" });
    }

    const readablePosts = await readableGroupPostFilter(req.user?._id);
    const ownership = tab === "posts"
      ? { $or: [{ author: profile._id }, { repostedBy: profile._id }, { likes: profile._id }] }
      : { $or: [{ author: profile._id }, { repostedBy: profile._id }] };
    let items;
    let total;

    if (tab === "events") {
      const query = { organizer: profile._id };
      [items, total] = await Promise.all([
        Event.find(query).populate("organizer", postAuthorFields).sort({ startsAt: -1, createdAt: -1 })
          .skip((page - 1) * limit).limit(limit).lean(),
        Event.countDocuments(query),
      ]);
      items = items.map((event) => ({ type: "event", createdAt: event.createdAt, event }));
    } else if (tab === "comments") {
      const visiblePosts = await Post.find(readablePosts).select("_id").lean();
      const query = { author: profile._id, post: { $in: visiblePosts.map((post) => post._id) } };
      const postComments = await Comment.find(query).populate("author", postAuthorFields).populate({
          path: "post",
          populate: { path: "author", select: postAuthorFields },
        }).lean();
      const eventComments = await Event.find({ "comments.author": profile._id })
        .populate("organizer", postAuthorFields)
        .populate("comments.author", postAuthorFields)
        .lean();
      const combined = [
        ...postComments.map((comment) => ({ type: "comment", createdAt: comment.createdAt, comment })),
        ...eventComments.flatMap((event) => event.comments
          .filter((comment) => comment.author?._id?.toString() === profile._id.toString())
          .map((comment) => ({
            type: "comment",
            createdAt: comment.createdAt,
            comment: {
              ...comment,
              event: { _id: event._id, title: event.title, organizer: event.organizer },
            },
          }))),
      ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
      total = combined.length;
      items = combined.slice((page - 1) * limit, page * limit);
    } else {
      const query = {
        $and: [
          tab === "reactions"
            ? { $or: [{ likes: profile._id }, { "reactions.user": profile._id }] }
            : ownership,
          ...(tab === "videos" ? [{ $or: [
            { "video.url": { $type: "string", $gt: "" } },
            { "repostOf.video.url": { $type: "string", $gt: "" } },
          ] }] : []),
          ...(tab === "images" ? [{ $or: [
            { "image.url": { $type: "string", $gt: "" } },
            { "repostOf.image.url": { $type: "string", $gt: "" } },
          ] }] : []),
          readablePosts,
        ],
      };
      [items, total] = await Promise.all([
        populatePost(Post.find(query)
          .sort(tab === "reactions" ? { updatedAt: -1, createdAt: -1 } : { createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)),
        Post.countDocuments(query),
      ]);
      items = items.map((post) => ({ type: tab === "reactions" ? "reaction" : "post", createdAt: post.updatedAt || post.createdAt, post }));
    }

    return res.json({ items, tab, page, limit, total, hasMore: page * limit < total });
  } catch (error) {
    console.error("Get profile activity error:", error);
    return res.status(500).json({ message: "Failed to load profile activity" });
  }
};

export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedPosts");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const posts = await populatePost(Post.find({
      $and: [
        { _id: { $in: user.savedPosts } },
        await readableGroupPostFilter(req.user._id),
      ],
    }).sort({ createdAt: -1 }));

    return res.status(200).json({ savedPosts: posts });
  } catch (error) {
    console.error("Get saved posts error:", error);

    return res.status(500).json({ message: "Failed to load saved posts" });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const reasons = ["spam", "harassment", "misinformation", "inappropriate", "other"];
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid post ID" });
    if (!reasons.includes(req.body.reason)) return res.status(400).json({ message: "Choose a valid report reason" });
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";
    if (details.length > 1000) return res.status(400).json({ message: "Report details must be 1000 characters or fewer" });
    const post = await Post.findById(id).select("author");
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() === req.user._id.toString()) return res.status(400).json({ message: "You cannot report your own post" });
    await PostReport.create({ post: id, reporter: req.user._id, reason: req.body.reason, details });
    return res.status(201).json({ message: "Post report submitted for review" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reported this post" });
    console.error("Report post error:", error);
    return res.status(500).json({ message: "Unable to submit post report" });
  }
};

export const toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(req.user._id).select("savedPosts");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadySaved = user.savedPosts.some((savedPostId) =>
      savedPostId.toString() === id,
    );

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (savedPostId) => savedPostId.toString() !== id,
      );
      await user.save();

      return res.status(200).json({ saved: false, postId: id });
    }

    user.savedPosts.push(post._id);
    await user.save();

    return res.status(200).json({ saved: true, postId: id });
  } catch (error) {
    console.error("Toggle save post error:", error);

    return res.status(500).json({ message: "Failed to update saved post" });
  }
};

export const togglePostComments = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const post = await Post.findById(req.params.id).select("author group commentsDisabled");
    if (!post) return res.status(404).json({ message: "Post not found" });

    let isGroupOwner = false;
    if (post.group) {
      const group = await Group.findById(post.group).select("owner");
      isGroupOwner = group?.owner?.toString() === req.user._id.toString();
    }
    if (post.author.toString() !== req.user._id.toString() && !isGroupOwner) {
      return res.status(403).json({ message: "You are not authorized to change post comments" });
    }

    post.commentsDisabled = !post.commentsDisabled;
    await post.save();
    return res.status(200).json({ commentsDisabled: post.commentsDisabled, postId: post._id });
  } catch (error) {
    console.error("Toggle post comments error:", error);
    return res.status(500).json({ message: "Failed to update post comments" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete this post",
      });
    }

    const commentIds = await Comment.find({ post: post._id }).distinct("_id");
    const cleanupItems = mediaCleanupItems(post);
    const repostIds = await Post.find({ repostOf: post._id }).distinct("_id");

    await Notification.deleteMany({
      $or: [
        { post: post._id },
        { post: { $in: repostIds } },
        { comment: { $in: commentIds } },
      ],
    });
    await Comment.deleteMany({ post: post._id });
    await Post.deleteMany({ repostOf: post._id });
    await post.deleteOne();
    await destroyMediaItems(cleanupItems);

    return res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);

    return res.status(500).json({
      message: "Failed to delete post",
    });
  }
};

export const repostPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const originalPost = await Post.findById(id).populate("author", postAuthorFields);

    if (!originalPost) {
      return res.status(404).json({
        message: "Post not found",
      });
    }
    if (originalPost.group) {
      const sourceGroup = await Group.findById(originalPost.group).select("privacy members");
      if (
        sourceGroup?.privacy === "private" &&
        !sourceGroup.members.some((memberId) => memberId.toString() === req.user._id.toString())
      ) {
        return res.status(403).json({ message: "Join the private group before reposting this post" });
      }
    }
    let repostGroup = null;
    if (req.body.groupId) {
      if (!mongoose.isValidObjectId(req.body.groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      repostGroup = await Group.findById(req.body.groupId).select("owner members requirePostApproval contentReviewMode contentReviewCriteria notificationMembers");
      if (!repostGroup) return res.status(404).json({ message: "Group not found" });
      if (!repostGroup.members.some((memberId) => memberId.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: "Join the group before reposting" });
      }
    }

    if (originalPost.author?._id?.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot repost your own post",
      });
    }

    const existingRepost = await Post.findOne({
      author: req.user._id,
      repostOf: originalPost._id,
    });

    if (existingRepost) {
      return res.status(409).json({
        message: "You already reposted this post",
      });
    }

    const repost = await Post.create({
      author: req.user._id,
      group: repostGroup?._id || null,
      groupPostStatus: needsGroupPostReview(repostGroup, req.user._id, {
        text: originalPost.text,
        image: originalPost.image,
        video: originalPost.video,
      }) ? "pending" : "approved",
      text: "",
      repostOf: originalPost._id,
      repostedBy: req.user._id,
      image: emptyMedia(),
      video: emptyMedia(),
    });

    const populatedPost = await populatePost(Post.findById(repost._id));
    const repostNeedsReview = repost.groupPostStatus === "pending";
    if (!repostNeedsReview && repostGroup?.notificationMembers?.length) {
      await Promise.all(repostGroup.notificationMembers
        .filter((recipient) => recipient.toString() !== req.user._id.toString())
        .map((recipient) => createNotification({
          recipient,
          sender: req.user._id,
          type: NOTIFICATION_TYPES.GROUP_POST,
          post: repost._id,
          group: repostGroup._id,
        })));
    }

    return res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Repost error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "You already reposted this post",
      });
    }

    return res.status(500).json({
      message: "Failed to repost post",
    });
  }
};

export const toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(id).select("author likes");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = post.likes.some((likedUserId) =>
      likedUserId.equals(req.user._id),
    );

    const update = alreadyLiked
      ? { $pull: { likes: req.user._id } }
      : { $addToSet: { likes: req.user._id } };

    const updatedPost = await populatePost(
      Post.findByIdAndUpdate(post._id, update, { new: true }),
    );

    if (alreadyLiked) {
      await Notification.deleteMany({
        recipient: post.author,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.POST_LIKE,
        post: post._id,
      });
    } else if (post.author.toString() !== userId) {
      await createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.POST_LIKE,
        post: post._id,
        dedupe: true,
      });
    }

    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Toggle like error:", error);

    return res.status(500).json({
      message: "Failed to update like",
    });
  }
};

export const togglePostReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedReactions = ["👍", "❤️", "😂", "😮", "😢", "👏"];
    const { emoji } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!allowedReactions.includes(emoji)) {
      return res.status(400).json({ message: "Invalid reaction" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id.toString();
    const existingReaction = post.reactions.find(
      (reaction) => reaction.user.toString() === userId,
    );

    if (existingReaction?.emoji === emoji) {
      post.reactions = post.reactions.filter(
        (reaction) => reaction.user.toString() !== userId,
      );
    } else if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      post.reactions.push({ user: req.user._id, emoji });
    }

    await post.save();
    return res.status(200).json(await populatePost(Post.findById(post._id)));
  } catch (error) {
    console.error("Toggle post reaction error:", error);
    return res.status(500).json({ message: "Failed to update reaction" });
  }
};

export const updatePost = async (req, res) => {
  let uploadedAsset;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to edit this post",
      });
    }

    const text = cleanPostText(req.body.text);
    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];
    const removeMedia = req.body.removeMedia === true || req.body.removeMedia === "true";

    if (imageFile && videoFile) {
      return res.status(400).json({
        message: "A post can contain either an image or a video, not both",
      });
    }

    assertFileType(
      imageFile,
      IMAGE_MIME_TYPES,
      "Only JPG, PNG, and WEBP images are allowed",
    );
    assertFileType(videoFile, VIDEO_MIME_TYPES, "Only MP4 and WEBM videos are allowed");

    let nextImage = post.image || emptyMedia();
    let nextVideo = post.video || emptyMedia();
    const cleanupItems = [];

    if (removeMedia || imageFile || videoFile) {
      cleanupItems.push(...mediaCleanupItems(post));
      nextImage = emptyMedia();
      nextVideo = emptyMedia();
    }

    if (imageFile) {
      const uploadResult = await uploadPostMedia(imageFile, {
        folder: "careerlink/post-images",
        resource_type: "image",
      });

      uploadedAsset = { publicId: uploadResult.public_id, options: {} };
      nextImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    if (videoFile) {
      const uploadResult = await uploadPostMedia(videoFile, {
        folder: "careerlink/post-videos",
        resource_type: "video",
      });

      uploadedAsset = {
        publicId: uploadResult.public_id,
        options: { resource_type: "video" },
      };
      nextVideo = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id || "",
      };
    }

    if (!text && !nextImage?.url && !nextVideo?.url) {
      await destroyCloudinaryAsset(uploadedAsset?.publicId, uploadedAsset?.options);

      return res.status(400).json({
        message: "Post text, image, or video is required",
      });
    }

    post.text = text;
    post.image = nextImage;
    post.video = nextVideo;

    await post.save();
    await destroyMediaItems(cleanupItems);

    const updatedPost = await populatePost(Post.findById(post._id));
    await notifyProfileMentions({ text, sender: req.user._id, post: post._id });

    return res.status(200).json(updatedPost);
  } catch (error) {
    await destroyCloudinaryAsset(uploadedAsset?.publicId, uploadedAsset?.options);

    const status = error.statusCode || 500;

    if (status >= 500) {
      console.error("Update post error:", error);
    }

    return res.status(status).json({
      message: status === 500 ? "Failed to update post" : error.message,
    });
  }
};
