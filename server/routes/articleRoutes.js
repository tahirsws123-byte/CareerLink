import express from "express";
import {
  createArticle,
  deleteArticle,
  getArticleById,
  getArticles,
  getSavedArticles,
  toggleSavedArticle,
  updateArticle,
} from "../controllers/articleController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { imageUpload } from "../middleware/uploadMiddleware.js";
import { uploadRateLimit } from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/", Protect, getArticles);
router.get("/saved", Protect, getSavedArticles);
router.post("/:articleId/save", Protect, toggleSavedArticle);
router.get("/:articleId", Protect, getArticleById);
router.post("/", Protect, uploadRateLimit, imageUpload.single("coverImage"), createArticle);
router.put("/:articleId", Protect, uploadRateLimit, imageUpload.single("coverImage"), updateArticle);
router.delete("/:articleId", Protect, deleteArticle);

export default router;
