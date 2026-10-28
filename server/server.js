import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import connectdb from "./config/db.js";
import { ensurePostIndexes } from "./utils/postIndexes.js";
import { ensureUserIndexes } from "./utils/userIndexes.js";
import { startNetworkCatchupScheduler } from "./utils/networkCatchupScheduler.js";

const app = express();

app.use(cors());
app.use(express.json());

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

await connectdb();
await ensurePostIndexes();
await ensureUserIndexes();

app.get("/", (req, res) => {
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
  startNetworkCatchupScheduler();
});
