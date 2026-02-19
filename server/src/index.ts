import { config } from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRootEnv = path.join(__dirname, "..", "..", ".env");
if (existsSync(repoRootEnv)) config({ path: repoRootEnv });

import { authRouter } from "./routes/auth.js";
import { appsRouter } from "./routes/apps.js";
import { systemRouter } from "./routes/system.js";
import { sessionMiddleware, requireAuth, loadUser } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 8289;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(loadUser);

app.use("/api/auth", authRouter);
app.use("/api/apps", requireAuth, appsRouter);
app.use("/api/system", requireAuth, systemRouter);

// Serve built client when present (e.g. after npm run build)
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Mjsrvr admin listening on http://localhost:${PORT}`);
});
