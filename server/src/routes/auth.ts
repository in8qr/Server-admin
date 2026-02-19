import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { verifyLogin } from "../auth.js";
import { getUsers, saveUsers } from "../lib/store.js";

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const user = await verifyLogin(username, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  req.session = req.session ?? {};
  req.session.userId = user.username;
  return res.json({ ok: true, username: user.username });
});

authRouter.post("/logout", (req: Request, res: Response) => {
  req.session = null as unknown as undefined;
  res.json({ ok: true });
});

authRouter.get("/me", (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  res.json({ username: userId });
});

// One-time setup: create admin user if no users exist (set ADMIN_USERNAME and ADMIN_PASSWORD in env)
authRouter.post("/setup", async (req: Request, res: Response) => {
  const users = getUsers();
  if (users.length > 0) {
    return res.status(400).json({ error: "Users already exist" });
  }
  const username = process.env.ADMIN_USERNAME ?? req.body?.username;
  const password = process.env.ADMIN_PASSWORD ?? req.body?.password;
  if (!username || !password) {
    return res.status(400).json({
      error: "Set ADMIN_USERNAME and ADMIN_PASSWORD in env, or send username/password in body",
    });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  saveUsers([{ username, passwordHash }]);
  return res.json({ ok: true, message: "Admin user created" });
});
