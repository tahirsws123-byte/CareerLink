import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import { createCorsOptions } from "./config/corsOptions.js";
import { parseTrustedProxyHops } from "./config/trustProxy.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import connectdb from "./config/db.js";
import { ensurePostIndexes } from "./utils/postIndexes.js";
import { ensureUserIndexes } from "./utils/userIndexes.js";
import { ensureCompanyPageIndexes } from "./utils/companyPageIndexes.js";
import { runNetworkCatchup } from "./utils/networkCatchupScheduler.js";

import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import companyPageRoutes from "./routes/companyPageRoutes.js";
import moderationRoutes from "./routes/moderationRoutes.js";

const app = express();
const corsOptions = createCorsOptions();
let databaseInitialization;

export const initializeDatabase = () => {
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      await connectdb();
      await ensurePostIndexes();
      await ensureUserIndexes();
      await ensureCompanyPageIndexes();
    })().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }
  return databaseInitialization;
};

app.disable("x-powered-by");
app.set("trust proxy", parseTrustedProxyHops(process.env.TRUST_PROXY_HOPS));

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));

app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  try {
    await initializeDatabase();
    return next();
  } catch (error) {
    console.error("API database initialization failed:", error.message);
    return res.status(503).json({ message: "Service temporarily unavailable" });
  }
});

app.get("/api/cron/network-catchup", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Network catch-up endpoint is not configured: CRON_SECRET is missing.");
    return res.status(503).json({ message: "Scheduled job is not configured" });
  }
  if (req.get("authorization") !== `Bearer ${cronSecret}`) {
    return res.sendStatus(401);
  }
  try {
    await runNetworkCatchup();
    return res.json({ success: true });
  } catch (error) {
    console.error("Network catch-up job failed:", error.message);
    return res.status(500).json({ message: "Network catch-up job failed" });
  }
});

app.get(["/", "/api"], (_req, res) => {
  res.send("Server is running");
});

app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/company-pages", companyPageRoutes);
app.use("/api/moderation", moderationRoutes);

export default app;