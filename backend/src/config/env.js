import "dotenv/config";

const corsOrigin = process.env.CORS_ORIGIN ?? "*";

export const config = {
  port: Number(process.env.PORT ?? 8000),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/hellojess",
  // "*" allows any origin; otherwise a comma-separated list, e.g. http://localhost:5173,http://localhost:8081
  corsOrigin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((origin) => origin.trim()),
  secretKey: process.env.SECRET_KEY ?? "dev-secret-change-me",
  tokenExpiresInSeconds: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 60 * 24 * 7) * 60,
};
