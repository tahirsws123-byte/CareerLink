import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const { default: app, initializeDatabase } = await import("./app.js");
export { app, initializeDatabase };
export default app;

const isMainModule = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  const { startNetworkCatchupScheduler } = await import("./utils/networkCatchupScheduler.js");
  await initializeDatabase();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    startNetworkCatchupScheduler();
  });
}
