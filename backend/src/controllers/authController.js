// Gère les requêtes liées au compte : inscription, connexion et "qui suis-je". Chaque fonction
// s'exécute après que la route a déjà validé le corps de la requête (voir routes/authRoutes.js).
import { User } from "../models/User.js";
import { createAccessToken, hashPassword, verifyPassword } from "../security.js";

// La réponse envoyée après une inscription/connexion réussie : un jeton signé et les infos de l'utilisateur.
function tokenResponse(user) {
  return { access_token: createAccessToken(user.id), token_type: "bearer", user };
}

// POST /api/auth/register - crée un compte et connecte l'utilisateur tout de suite.
export async function register(_req, res) {
  // Le corps validé a été rangé dans res.locals par le middleware validate().
  const { email, name, password } = res.locals.body;
  // Hache le mot de passe pour que seul le hash soit stocké.
  const hashedPassword = await hashPassword(password);

  try {
    // Enregistre le nouvel utilisateur. Lève une erreur si l'email existe déjà (index unique).
    const user = await User.create({ email, name, hashed_password: hashedPassword });
    res.status(201).json(tokenResponse(user));
  } catch (err) {
    // 11000 est le code d'erreur MongoDB "clé en double", c'est-à-dire que l'email est déjà pris.
    if (err.code === 11000) {
      return res.status(400).json({ detail: "Email already registered" });
    }
    throw err;
  }
}

// POST /api/auth/login - vérifie les identifiants et renvoie un jeton.
export async function login(_req, res) {
  const { email, password } = res.locals.body;
  const user = await User.findOne({ email });

  // Même erreur pour "email inconnu" et "mauvais mot de passe", pour qu'on ne puisse pas deviner quels emails existent.
  if (!user || !(await verifyPassword(password, user.hashed_password))) {
    return res
      .status(401)
      .set("WWW-Authenticate", "Bearer")
      .json({ detail: "Incorrect email or password" });
  }

  res.json(tokenResponse(user));
}

// GET /api/auth/me - renvoie l'utilisateur connecté (le middleware requireAuth l'a déjà chargé).
export function getMe(req, res) {
  res.json(req.user);
}

// PATCH /api/auth/me - modifie le nom et/ou l'email de l'utilisateur connecté.
// Seuls ces deux champs sont modifiables (le schéma ignore tout le reste, par exemple le mot de passe).
export async function updateMe(req, res) {
  try {
    req.user.set(res.locals.body);
    await req.user.save();
  } catch (err) {
    // 11000 = clé en double : un autre compte utilise déjà cet email.
    if (err.code === 11000) {
      return res.status(400).json({ detail: "Email already registered" });
    }
    throw err;
  }
  // On renvoie le profil à jour avec un nouveau jeton (les anciens jetons basés sur l'email cesseraient de fonctionner).
  res.json(tokenResponse(req.user));
}
