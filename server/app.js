import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import { createCorsOptions } from "./config/corsOptions.js";
import { parseTrustedProxyHops } from "./config/trustProxy.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import connectdb from "./config/db.js";
import { ensurePostIndexes } from "./utils/postIndexes.js";
import { ensureUserIndexes } from "./utils/userIndexes.js";
import { ensureCompanyPageIndexes } from "./utils/companyPageIndexes.js";

const app = express();
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
app.use(securityHeaders);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: "1mb" }));

app.use(async (_req, res, next) => {
  try {
    await initializeDatabase();
    return next();
  } catch (error) {
    console.error("API database initialization failed:", error.message);
    return res.status(503).json({ message: "Service temporarily unavailable" });
  }
});

const { default: jobRoutes } = await import("./routes/jobRoutes.js");
const { default: userRoutes } = await import("./routes/userRoutes.js");
const { default: postRoutes } = await import("./routes/postRoutes.js");
const { default: commentRoutes } = await import("./routes/commentRoutes.js");
const { default: connectionRoutes } = await import("./routes/connectionRoutes.js");
const { default: notificationRoutes } = await import("./routes/notificationRoutes.js");
const { default: messageRoutes } = await import("./routes/messageRoutes.js");
const { default: articleRoutes } = await import("./routes/articleRoutes.js");
const { default: communityRoutes } = await import("./routes/communityRoutes.js");
const { default: searchRoutes } = await import("./routes/searchRoutes.js");
const { default: companyPageRoutes } = await import("./routes/companyPageRoutes.js");
const { default: moderationRoutes } = await import("./routes/moderationRoutes.js");

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
