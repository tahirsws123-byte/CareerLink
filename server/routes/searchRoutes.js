import express from "express";
import { searchAll } from "../controllers/searchController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", Protect, searchAll);
export default router;
