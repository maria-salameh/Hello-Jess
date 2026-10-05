import { User } from "../models/User.js";
import { createAccessToken, hashPassword, verifyPassword } from "../security.js";

function tokenResponse(user) {
  return { access_token: createAccessToken(user.email), token_type: "bearer", user };
}

export async function register(_req, res) {
  const { email, name, password } = res.locals.body;
  const hashedPassword = await hashPassword(password);

  try {
    const user = await User.create({ email, name, hashed_password: hashedPassword });
    res.status(201).json(tokenResponse(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ detail: "Email already registered" });
    }
    throw err;
  }
}

export async function login(_req, res) {
  const { email, password } = res.locals.body;
  const user = await User.findOne({ email });

  if (!user || !(await verifyPassword(password, user.hashed_password))) {
    return res
      .status(401)
      .set("WWW-Authenticate", "Bearer")
      .json({ detail: "Incorrect email or password" });
  }

  res.json(tokenResponse(user));
}

export function getMe(req, res) {
  res.json(req.user);
}
