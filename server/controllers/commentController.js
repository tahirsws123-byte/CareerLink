import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";
import { createNotification, notifyProfileMentions } from "../utils/notificationUtils.js";

const COMMENT_MAX_LENGTH = 500;

export const createComment = async (req, res) => {
  try {
    const { postId } = req.body;
    const cleanText = req.body.text?.trim();

    if (!postId || !cleanText) {
      return res.status(400).json({
        message: "Post ID and comment text are required",
      });
    }

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    if (cleanText.length > COMMENT_MAX_LENGTH) {
      return res.status(400).json({
        message: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`,
      });
    }

    const post = await Post.findById(postId).select("author commentsCount commentsDisabled");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }
    if (post.commentsDisabled) {
      return res.status(403).json({ message: "Comments are disabled for this post" });
    }

    const comment = await Comment.create({
      author: req.user._id,
      post: post._id,
      text: cleanText,
    });

    await Post.updateOne(
      {
        _id: post._id,
      },
      {
        $inc: {
          commentsCount: 1,
        },
      },
    );

    await comment.populate("author", "name headline profilePicture publicProfileSlug");

    await createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.POST_COMMENT,
      post: post._id,
      comment: comment._id,
    });
    await notifyProfileMentions({ text: cleanText, sender: req.user._id, post: post._id, comment: comment._id });

    return res.status(201).json(comment);
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      message: "Failed to create comment",
    });
  }
};

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId).select("_id");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comments = await Comment.find({ post: post._id })
      .populate("author", "name headline profilePicture publicProfileSlug")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json(comments);
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      message: "Failed to load comments",
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(id).populate("post", "author");

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const isCommentOwner = comment.author.toString() === req.user._id.toString();
    const isPostOwner =
      comment.post?.author?.toString() === req.user._id.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        message: "You are not authorized to delete this comment",
      });
    }

    await Notification.deleteMany({ comment: comment._id });
    await comment.deleteOne();

    if (comment.post?._id) {
      await Post.updateOne(
        {
          _id: comment.post._id,
          commentsCount: {
            $gt: 0,
          },
        },
        {
          $inc: {
            commentsCount: -1,
          },
        },
      );
    }

    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      message: "Failed to delete comment",
    });
  }
};
