import express from "express";
import {
  getModerationAccess,
  listModerationReports,
  updateModerationReport,
} from "../controllers/moderationController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { requirePlatformModerator } from "../middleware/moderatorMiddleware.js";

const router = express.Router();
router.get("/access", Protect, getModerationAccess);
router.get("/reports", Protect, requirePlatformModerator, listModerationReports);
router.patch("/reports/:type/:reportId", Protect, requirePlatformModerator, updateModerationReport);

export default router;
