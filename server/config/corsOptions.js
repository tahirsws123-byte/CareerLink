const deployedFrontendOrigins = [
  "https://careerlink-1eymtikjk-tahirsws123-4822s-projects.vercel.app",
  "https://careerlink-nine.vercel.app",
];

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

  const allowedOrigins = new Set([...configured, ...deployedFrontendOrigins]);
  if (configured.length || env.NODE_ENV === "production") return allowedOrigins;
  return new Set([
    ...allowedOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
};

export const createCorsOptions = (env = process.env) => {
  const allowedOrigins = getAllowedOrigins(env);
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
};
