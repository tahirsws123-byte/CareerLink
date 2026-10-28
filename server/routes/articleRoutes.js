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
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", Protect, getArticles);
router.get("/saved", Protect, getSavedArticles);
router.post("/:articleId/save", Protect, toggleSavedArticle);
router.get("/:articleId", Protect, getArticleById);
router.post("/", Protect, upload.single("coverImage"), createArticle);
router.put("/:articleId", Protect, upload.single("coverImage"), updateArticle);
router.delete("/:articleId", Protect, deleteArticle);

export default router;
