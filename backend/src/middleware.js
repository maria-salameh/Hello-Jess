import { User } from "./models/User.js";
import { decodeAccessToken } from "./security.js";

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

function unauthorized(res, detail) {
  return res.status(401).set("WWW-Authenticate", "Bearer").json({ detail });
}

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return unauthorized(res, "Not authenticated");
  }

  const email = decodeAccessToken(token);
  const user = email ? await User.findOne({ email }) : null;
  if (!user) {
    return unauthorized(res, "Could not validate credentials");
  }

  req.user = user;
  next();
}
