import express from "express";
import {
  createPost,
  deletePost,
  getPosts,
  getProfilePosts,
  getProfileActivity,
  getMyActivity,
  getSavedPosts,
  repostPost,
  toggleLikePost,
  togglePostReaction,
  voteOnPostPoll,
  toggleSavePost,
  updatePost,
  reportPost,
  togglePostComments,
} from "../controllers/postController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { OptionalAuth } from "../middleware/optionalAuthMiddleware.js";
import upload, { handlePostUploadError } from "../middleware/uploadMiddleware.js";

const router = express.Router();
const receivePostMedia = (req, res, next) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ])(req, res, (error) => {
    if (error) return handlePostUploadError(error, req, res, next);
    return next();
  });
};

router.get("/saved", Protect, getSavedPosts);
router.get("/activity/mine", Protect, getMyActivity);
router.get("/profile/:userId/activity", OptionalAuth, getProfileActivity);
router.get("/profile/:userId", OptionalAuth, getProfilePosts);

router.get("/", Protect, getPosts);

router.post(
  "/",
  Protect,
  receivePostMedia,
  createPost,
);

router.post("/:id/save", Protect, toggleSavePost);
router.post("/:id/repost", Protect, repostPost);
router.post("/:id/like", Protect, toggleLikePost);
router.post("/:id/reaction", Protect, togglePostReaction);
router.post("/:id/poll/vote", Protect, voteOnPostPoll);
router.post("/:id/report", Protect, reportPost);
router.post("/:id/comments/toggle", Protect, togglePostComments);

router.delete("/:id", Protect, deletePost);

router.put(
  "/:id",
  Protect,
  receivePostMedia,
  updatePost,
);

export default router;
