import express from "express";
import {
  deleteEducation,
  getFollowingUsers,
  getUnfollowedUsers,
  getFollowedJobPosters,
  getDiscoverableUsers,
  getDiscoverableJobPosters,
  getFollowersUsers,
  getProfileSuggestions,
  getRelatedProfiles,
  getProfile,
  getUserById,
  handleGoogleCallback,
  loginUser,
  requestPasswordReset,
  registerUser,
  resetPassword,
  removeCoverImage,
  removeProfileImage,
  searchUsers,
  startGoogleAuth,
  toggleFollowUser,
  updateProfile,
  updateNotificationPreferences,
  updateDataPrivacyPreferences,
  changePassword,
  uploadCoverImage,
  uploadResume,
  deleteResume,
  getResumeDownloadUrl,
  deactivateAccount,
  deleteAccount,
  exportMyData,
  getProfileViewers,
  getProfileAnalytics,
  getSecuritySettings,
  requestSecurityCode,
  confirmSecurityAction,
  getBlockedUsers,
  blockUser,
  unblockUser,
} from "../controllers/userController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { OptionalAuth } from "../middleware/optionalAuthMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { uploadProfileImage } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/password-reset/request", requestPasswordReset);

router.post("/password-reset/confirm", resetPassword);

router.get("/auth/google", startGoogleAuth);

router.get("/auth/google/callback", handleGoogleCallback);

router.get("/profile", Protect, getProfile);
router.get("/data-export", Protect, exportMyData);
router.get("/profile-views/mine", Protect, getProfileViewers);
router.get("/analytics/mine", Protect, getProfileAnalytics);
router.get("/suggestions", Protect, getProfileSuggestions);
router.get("/:userId/related", Protect, getRelatedProfiles);

router.put("/notification-preferences", Protect, updateNotificationPreferences);
router.put("/data-privacy-preferences", Protect, updateDataPrivacyPreferences);

router.put("/password", Protect, changePassword);
router.get("/security", Protect, getSecuritySettings);
router.post("/security/code", Protect, requestSecurityCode);
router.post("/security/confirm", Protect, confirmSecurityAction);
router.post("/deactivate", Protect, deactivateAccount);
router.delete("/account", Protect, deleteAccount);
router.post("/resumes", Protect, upload.single("resume"), uploadResume);
router.get("/resumes/:resumeId/download", Protect, getResumeDownloadUrl);
router.delete("/resumes/:resumeId", Protect, deleteResume);

router.get("/following", Protect, getFollowingUsers);
router.get("/unfollowed", Protect, getUnfollowedUsers);
router.get("/following/job-posters", Protect, getFollowedJobPosters);
router.get("/pages/discover", Protect, getDiscoverableJobPosters);
router.get("/followers", Protect, getFollowersUsers);
router.get("/blocked", Protect, getBlockedUsers);
router.post("/block/:userId", Protect, blockUser);
router.delete("/block/:userId", Protect, unblockUser);
router.get("/discover", Protect, getDiscoverableUsers);

router.get("/search", Protect, searchUsers);

router.post("/follow/:userId", Protect, toggleFollowUser);

router.post(
  "/profile-image",
  Protect,
  upload.single("image"),
  uploadProfileImage,
);

router.delete("/profile-image", Protect, removeProfileImage);

router.put("/profile", Protect, updateProfile);

router.delete("/education/:educationId", Protect, deleteEducation);

router.post("/cover-image", Protect, upload.single("image"), uploadCoverImage);

router.delete("/cover-image", Protect, removeCoverImage);

router.get("/:userId", OptionalAuth, getUserById);

export default router;
