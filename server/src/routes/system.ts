import { Router, Request, Response } from "express";
import { getSystemMetrics } from "../lib/metrics.js";

export const systemRouter = Router();

systemRouter.get("/", (_req: Request, res: Response) => {
  try {
    res.json(getSystemMetrics());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
