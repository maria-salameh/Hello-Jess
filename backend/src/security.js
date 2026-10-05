import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config/env.js";

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createAccessToken(email) {
  return jwt.sign({ sub: email }, config.secretKey, {
    algorithm: "HS256",
    expiresIn: config.tokenExpiresInSeconds,
  });
}

export function decodeAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.secretKey, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
