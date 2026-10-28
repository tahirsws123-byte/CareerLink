import express from "express";
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  muteNotificationSender,
  showLessLikeThis,
} from "../controllers/notificationController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(Protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.post("/:id/show-less", showLessLikeThis);
router.post("/:id/mute-sender", muteNotificationSender);
router.delete("/:id", deleteNotification);

export default router;
