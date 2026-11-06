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
import { imageUpload, resumeUpload } from "../middleware/uploadMiddleware.js";
import { uploadProfileImage } from "../controllers/userController.js";
import {
  googleAuthRateLimit,
  loginRateLimit,
  passwordChangeRateLimit,
  passwordResetConfirmRateLimit,
  passwordResetRequestRateLimit,
  registrationRateLimit,
  securityCodeRateLimit,
  securityConfirmRateLimit,
  userSearchRateLimit,
  uploadRateLimit,
} from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/register", registrationRateLimit, registerUser);

router.post("/login", loginRateLimit, loginUser);

router.post("/password-reset/request", passwordResetRequestRateLimit, requestPasswordReset);

router.post("/password-reset/confirm", passwordResetConfirmRateLimit, resetPassword);

router.get("/auth/google", googleAuthRateLimit, startGoogleAuth);

router.get("/auth/google/callback", handleGoogleCallback);

router.get("/profile", Protect, getProfile);
router.get("/data-export", Protect, exportMyData);
router.get("/profile-views/mine", Protect, getProfileViewers);
router.get("/analytics/mine", Protect, getProfileAnalytics);
router.get("/suggestions", Protect, getProfileSuggestions);
router.get("/:userId/related", Protect, getRelatedProfiles);

router.put("/notification-preferences", Protect, updateNotificationPreferences);
router.put("/data-privacy-preferences", Protect, updateDataPrivacyPreferences);

router.put("/password", Protect, passwordChangeRateLimit, changePassword);
router.get("/security", Protect, getSecuritySettings);
router.post("/security/code", Protect, securityCodeRateLimit, requestSecurityCode);
router.post("/security/confirm", Protect, securityConfirmRateLimit, confirmSecurityAction);
router.post("/deactivate", Protect, deactivateAccount);
router.delete("/account", Protect, deleteAccount);
router.post("/resumes", Protect, uploadRateLimit, resumeUpload.single("resume"), uploadResume);
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

router.get("/search", Protect, userSearchRateLimit, searchUsers);

router.post("/follow/:userId", Protect, toggleFollowUser);

router.post(
  "/profile-image",
  Protect,
  uploadRateLimit,
  imageUpload.single("image"),
  uploadProfileImage,
);

router.delete("/profile-image", Protect, removeProfileImage);

router.put("/profile", Protect, updateProfile);

router.delete("/education/:educationId", Protect, deleteEducation);

router.post("/cover-image", Protect, uploadRateLimit, imageUpload.single("image"), uploadCoverImage);

router.delete("/cover-image", Protect, removeCoverImage);

router.get("/:userId", OptionalAuth, getUserById);

export default router;
