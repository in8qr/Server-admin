import { Request, Response, NextFunction } from "express";
import session from "cookie-session";
import bcrypt from "bcryptjs";
import { getUsers, type User } from "./lib/store.js";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "change-me-in-production";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    session?: { userId?: string };
  }
}

export const sessionMiddleware = session({
  name: "mjsrvr",
  secret: SESSION_SECRET,
  maxAge: COOKIE_MAX_AGE,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
});

export function loadUser(req: Request, _res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (userId) {
    const users = getUsers();
    const u = users.find((x) => x.username === userId);
    if (u) req.user = { username: u.username, passwordHash: u.passwordHash };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  res.status(401).json({ error: "Unauthorized" });
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<User | null> {
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }
  return { username: user.username, passwordHash: user.passwordHash };
}
