import express from "express";
import {
  createCompanyPage,
  createCompanyPagePost,
  discoverCompanyPages,
  getCompanyPageActivity,
  getCompanyPageAnalytics,
  getPublicCompanyPage,
  getCompanyPageManagement,
  getCompanyPagePostMetrics,
  getCompanyPageSettings,
  addCompanyPageAdmin,
  updateCompanyPageAdminRole,
  removeCompanyPageAdmin,
  transferCompanyPageSuperAdmin,
  listFollowedCompanyPages,
  listMyCompanyPages,
  searchCompanyPageCompetitors,
  toggleCompanyPageFollow,
  toggleCompanyPageRelationship,
  setCompanyPageActive,
  updateCompanyPageSettings,
  updateCompanyPage,
  updateCompanyPageCompetitors,
} from "../controllers/companyPageController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { OptionalAuth } from "../middleware/optionalAuthMiddleware.js";
import {
  companyLogoUpload,
  companyPageMediaUpload,
  handleCompanyLogoUploadError,
  handleCompanyPageMediaUploadError,
  postMediaUpload,
} from "../middleware/uploadMiddleware.js";
import { uploadRateLimit } from "../middleware/rateLimiters.js";

const router = express.Router();
const receiveCompanyPagePostMedia = (req, res, next) => {
  postMediaUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ])(req, res, next);
};

router.post("/", Protect, uploadRateLimit, companyLogoUpload.single("logo"), handleCompanyLogoUploadError, createCompanyPage);
router.get("/discover", OptionalAuth, discoverCompanyPages);
router.get("/mine", Protect, listMyCompanyPages);
router.get("/following", Protect, listFollowedCompanyPages);
router.get("/public/:publicUrlSlug", OptionalAuth, getPublicCompanyPage);
router.put("/:companyPageId", Protect, uploadRateLimit, companyPageMediaUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]), handleCompanyPageMediaUploadError, updateCompanyPage);
router.get("/:companyPageId/manage", Protect, getCompanyPageManagement);
router.get("/:companyPageId/settings", Protect, getCompanyPageSettings);
router.put("/:companyPageId/settings", Protect, updateCompanyPageSettings);
router.post("/:companyPageId/admins", Protect, addCompanyPageAdmin);
router.patch("/:companyPageId/admins/:adminId", Protect, updateCompanyPageAdminRole);
router.delete("/:companyPageId/admins/:adminId", Protect, removeCompanyPageAdmin);
router.post("/:companyPageId/admins/:adminId/transfer-super-admin", Protect, transferCompanyPageSuperAdmin);
router.post("/:companyPageId/settings/:kind/:targetId", Protect, toggleCompanyPageRelationship);
router.patch("/:companyPageId/active", Protect, setCompanyPageActive);
router.get("/:companyPageId/posts/:postId/metrics", Protect, getCompanyPagePostMetrics);
router.get("/:companyPageId/analytics", Protect, getCompanyPageAnalytics);
router.get("/:companyPageId/activity", Protect, getCompanyPageActivity);
router.get("/:companyPageId/competitors/search", Protect, searchCompanyPageCompetitors);
router.put("/:companyPageId/competitors", Protect, updateCompanyPageCompetitors);
router.post("/:companyPageId/follow", Protect, toggleCompanyPageFollow);
router.post("/:companyPageId/posts", Protect, uploadRateLimit, receiveCompanyPagePostMedia, createCompanyPagePost);

export default router;
