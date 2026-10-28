import express from "express";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  getConnectionCount,
  getConnectionStatus,
  getConnectionSummary,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
} from "../controllers/connectionController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(Protect);

router.get("/summary", getConnectionSummary);
router.get("/count", getConnectionCount);
router.get("/status/:userId", getConnectionStatus);
router.post("/:userId/request", sendConnectionRequest);
router.delete("/:id/cancel", cancelConnectionRequest);
router.patch("/:id/accept", acceptConnectionRequest);
router.patch("/:id/reject", rejectConnectionRequest);
router.delete("/:id", removeConnection);

export default router;
