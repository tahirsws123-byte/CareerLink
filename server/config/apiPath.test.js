import assert from "node:assert/strict";
import { after, test } from "node:test";
import cors from "cors";
import express from "express";
import { apiPathMiddleware } from "./apiPath.js";
import { createCorsOptions } from "./corsOptions.js";
const app = express();
app.use(apiPathMiddleware);
app.use(cors(createCorsOptions({ NODE_ENV: "production" })));
app.post("/api/users/register", (_req, res) => res.sendStatus(201));
const server = app.listen(0);
const apiUrl = new Promise((resolve, reject) => {
  server.once("listening", () => {
    const address = server.address();
    resolve(`http://127.0.0.1:${address.port}/users/register`);
  });
  server.once("error", reject);
});
after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));
test("Vercel-style API paths are routed to Express API endpoints", async () => {
  const response = await fetch(await apiUrl, {
    method: "POST",
    headers: {
      Origin: "https://careerlink-nine.vercel.app",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://careerlink-nine.vercel.app");
});
test("Vercel-style API preflight returns CORS headers", async () => {
  const response = await fetch(await apiUrl, {
    method: "OPTIONS",
    headers: {
      Origin: "https://careerlink-nine.vercel.app",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://careerlink-nine.vercel.app");
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
});