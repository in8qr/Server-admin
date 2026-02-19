import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "..", "..", "data");

export interface User {
  username: string;
  passwordHash: string;
}

export interface AppLink {
  id: string;
  name: string;
  url: string;
  category: string;
  openInNewTab?: boolean;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function dataPath(file: string) {
  ensureDataDir();
  return path.join(DATA_DIR, file);
}

const USERS_FILE = "users.json";
const APPS_FILE = "apps.json";

const defaultUsers: User[] = [];
const defaultApps: AppLink[] = [];

function readJson<T>(file: string, defaultValue: T): T {
  const p = dataPath(file);
  if (!existsSync(p)) return defaultValue;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(file: string, data: T) {
  writeFileSync(dataPath(file), JSON.stringify(data, null, 2), "utf-8");
}

export function getUsers(): User[] {
  return readJson<User[]>(USERS_FILE, defaultUsers);
}

export function saveUsers(users: User[]) {
  writeJson(USERS_FILE, users);
}

export function getApps(): AppLink[] {
  return readJson<AppLink[]>(APPS_FILE, defaultApps);
}

export function saveApps(apps: AppLink[]) {
  writeJson(APPS_FILE, apps);
}
