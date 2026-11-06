import express from "express";
import { searchAll } from "../controllers/searchController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { searchRateLimit } from "../middleware/rateLimiters.js";

const router = express.Router();
router.get("/", Protect, searchRateLimit, searchAll);
export default router;
