import express from "express";
import { createComment, deleteComment, getComments } from "../controllers/commentController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", Protect, createComment);

router.get("/:postId", Protect, getComments);

router.delete("/:id", Protect, deleteComment);

export default router;
