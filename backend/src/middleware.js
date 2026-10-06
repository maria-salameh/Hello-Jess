// Fonctions exécutées avant un contrôleur : vérifier les données reçues et vérifier qui appelle.
import { User } from "./models/User.js";
import { decodeAccessToken } from "./security.js";

// Réponse 422 standard : un message général et la liste des champs en erreur, par exemple
// { detail: "Validation failed", errors: [{ field: "title", message: "title must not be empty" }] }.
export function validationError(res, errors) {
  return res.status(422).json({ detail: "Validation failed", errors });
}

// Crée un middleware qui vérifie le corps (ou les paramètres d'URL) de la requête avec un schéma zod.
// En cas de succès, les données nettoyées sont gardées dans res.locals pour le contrôleur ; sinon il répond 422.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // On transforme les erreurs zod en liste simple { field, message } facile à afficher.
      return validationError(
        res,
        result.error.issues.map((issue) => ({ field: issue.path.join(".") || source, message: issue.message }))
      );
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
  // Les jetons actuels contiennent l'id de l'utilisateur ; les anciens contenaient son email (toujours acceptés).
  const subject = decodeAccessToken(token);
  let user = null;
  if (subject) {
    user = /^[0-9a-f]{24}$/i.test(subject) ? await User.findById(subject) : await User.findOne({ email: subject });
  }
  if (!user) {
    return unauthorized(res, "Could not validate credentials");
  }

  req.user = user;
  next();
}
