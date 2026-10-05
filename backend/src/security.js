// Hachage des mots de passe et jetons de connexion.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config/env.js";

// Transforme un mot de passe en hash bcrypt pour le stockage (12 = coût du hachage ;
// plus il est élevé, plus c'est lent pour un attaquant, mais aussi pour nous).
export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Vérifie un mot de passe saisi à la connexion par rapport au hash stocké.
export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Crée un jeton de connexion signé (JWT) qui identifie l'utilisateur par son email et expire au bout d'un moment.
// Les applications le renvoient à chaque requête dans l'en-tête Authorization.
export function createAccessToken(email) {
  return jwt.sign({ sub: email }, config.secretKey, {
    algorithm: "HS256",
    expiresIn: config.tokenExpiresInSeconds,
  });
}

// Vérifie la signature et l'expiration d'un jeton. Renvoie l'email pour lequel il a été émis,
// ou null si le jeton est invalide, falsifié ou expiré.
export function decodeAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.secretKey, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
