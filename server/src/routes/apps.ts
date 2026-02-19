import { Router, Request, Response } from "express";
import { getApps, saveApps, type AppLink } from "../lib/store.js";

const id = () => Math.random().toString(36).slice(2, 11);

export const appsRouter = Router();

appsRouter.get("/", (_req: Request, res: Response) => {
  res.json(getApps());
});

appsRouter.post("/", (req: Request, res: Response) => {
  const { name, url, category, openInNewTab } = req.body ?? {};
  if (!name || !url) {
    return res.status(400).json({ error: "name and url required" });
  }
  const apps = getApps();
  const link: AppLink = {
    id: id(),
    name: String(name).trim(),
    url: String(url).trim(),
    category: String(category ?? "General").trim(),
    openInNewTab: openInNewTab !== false,
  };
  apps.push(link);
  saveApps(apps);
  res.status(201).json(link);
});

appsRouter.put("/:id", (req: Request, res: Response) => {
  const { id: linkId } = req.params;
  const { name, url, category, openInNewTab } = req.body ?? {};
  const apps = getApps();
  const i = apps.findIndex((a) => a.id === linkId);
  if (i === -1) return res.status(404).json({ error: "Not found" });
  if (name !== undefined) apps[i].name = String(name).trim();
  if (url !== undefined) apps[i].url = String(url).trim();
  if (category !== undefined) apps[i].category = String(category).trim();
  if (openInNewTab !== undefined) apps[i].openInNewTab = Boolean(openInNewTab);
  saveApps(apps);
  res.json(apps[i]);
});

appsRouter.delete("/:id", (req: Request, res: Response) => {
  const { id: linkId } = req.params;
  const apps = getApps().filter((a) => a.id !== linkId);
  if (apps.length === getApps().length) return res.status(404).json({ error: "Not found" });
  saveApps(apps);
  res.status(204).send();
});
