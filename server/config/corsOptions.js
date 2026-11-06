const normalizeOrigin = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
};

export const getAllowedOrigins = (env = process.env) => {
  const configured = [
    ...(env.CORS_ORIGINS || "").split(","),
    env.CLIENT_URL,
    env.FRONTEND_URL,
    env.FRONTEND_ORIGIN,
  ].map(normalizeOrigin).filter(Boolean);

  if (configured.length) return new Set(configured);
  if (env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGINS (or CLIENT_URL/FRONTEND_URL) must contain the production web origin");
  }
  return new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
};

export const createCorsOptions = (env = process.env) => {
  const allowedOrigins = getAllowedOrigins(env);
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
      return callback(null, false);
    },
  };
};
