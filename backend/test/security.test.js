// Tests des mots de passe et des jetons de connexion. Lancer avec : npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { config } from "../src/config/env.js";
import { createAccessToken, decodeAccessToken, hashPassword, verifyPassword } from "../src/security.js";

test("un mot de passe haché ne ressemble pas au mot de passe et se vérifie correctement", async () => {
  const hash = await hashPassword("my-secret-password");
  assert.notEqual(hash, "my-secret-password");
  assert.match(hash, /^\$2[aby]\$12\$/); // bcrypt, coût 12
  assert.equal(await verifyPassword("my-secret-password", hash), true);
  assert.equal(await verifyPassword("another-password", hash), false);
});

test("un jeton renvoie le sujet pour lequel il a été créé (l'id de l'utilisateur)", () => {
  const id = "6ac39c9e78f406b9bc4fd43a";
  assert.equal(decodeAccessToken(createAccessToken(id)), id);
});

test("les anciens jetons, dont le sujet est un email, sont toujours lus correctement", () => {
  assert.equal(decodeAccessToken(createAccessToken("maria@example.com")), "maria@example.com");
});

test("un jeton falsifié, signé avec un autre secret, expiré ou qui n'en est pas un est refusé (null)", () => {
  const token = createAccessToken("6ac39c9e78f406b9bc4fd43a");

  assert.equal(decodeAccessToken(token.slice(0, -2) + "xx"), null); // signature modifiée
  assert.equal(decodeAccessToken("garbage"), null);
  assert.equal(decodeAccessToken(""), null);
  assert.equal(decodeAccessToken(jwt.sign({ sub: "someone" }, "another-secret", { algorithm: "HS256" })), null);
  assert.equal(decodeAccessToken(jwt.sign({ sub: "someone" }, config.secretKey, { algorithm: "HS256", expiresIn: -10 })), null);
  // Un jeton sans sujet texte n'identifie personne.
  assert.equal(decodeAccessToken(jwt.sign({ foo: "bar" }, config.secretKey, { algorithm: "HS256" })), null);
});

test("un jeton non signé (algorithme 'none') est refusé", () => {
  const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from('{"sub":"someone"}').toString("base64url")}.`;
  assert.equal(decodeAccessToken(unsigned), null);
});
