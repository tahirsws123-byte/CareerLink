import express from "express";
import {
  createOrGetConversation,
  getConversations,
  getMessages,
  getUnreadMessageCount,
  sendMessage,
  toggleConversationStar,
  updateConversationAction,
  updateMessageAction,
} from "../controllers/messageController.js";
import { Protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(Protect);

router.get("/unread-count", getUnreadMessageCount);
router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.post("/conversations/:conversationId/star", toggleConversationStar);
router.post("/conversations/:conversationId/action", updateConversationAction);
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", upload.single("attachment"), sendMessage);
router.post("/conversations/:conversationId/messages/:messageId/action", updateMessageAction);

export default router;
