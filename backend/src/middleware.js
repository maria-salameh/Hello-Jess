// Fonctions exécutées avant un contrôleur : vérifier les données reçues et vérifier qui appelle.
import { User } from "./models/User.js";
import { decodeAccessToken } from "./security.js";

// Crée un middleware qui vérifie le corps (ou les paramètres d'URL) de la requête avec un schéma zod.
// En cas de succès, les données nettoyées sont gardées dans res.locals pour le contrôleur ; sinon il répond 422.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(422).json({ detail: result.error.issues });
    }
    res.locals[source] = result.data;
    next();
  };
}

// Envoie une réponse 401 "accès refusé" et indique au client que l'API attend un jeton Bearer.
function unauthorized(res, detail) {
  return res.status(401).set("WWW-Authenticate", "Bearer").json({ detail });
}

// Protège une route : seules les requêtes avec un jeton de connexion valide passent.
// L'utilisateur connecté est attaché à la requête sous req.user pour que les contrôleurs l'utilisent.
export async function requireAuth(req, res, next) {
  // Le jeton arrive sous la forme "Authorization: Bearer <jeton>".
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return unauthorized(res, "Not authenticated");
  }

  // Vérifie le jeton, puis s'assure que l'utilisateur qu'il désigne existe toujours dans la base.
  const email = decodeAccessToken(token);
  const user = email ? await User.findOne({ email }) : null;
  if (!user) {
    return unauthorized(res, "Could not validate credentials");
  }

  req.user = user;
  next();
}
