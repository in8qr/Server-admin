const API = "/api";

const opts = (method: string, body?: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include" as RequestCredentials,
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, options);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `HTTP ${r.status}`);
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}

export const apps = {
  list: () => fetchJson<AppLink[]>("/apps"),
  create: (data: { name: string; url: string; category?: string; openInNewTab?: boolean }) =>
    fetchJson<AppLink>("/apps", opts("POST", data)),
  update: (id: string, data: Partial<{ name: string; url: string; category: string; openInNewTab: boolean }>) =>
    fetchJson<AppLink>(`/apps/${id}`, opts("PUT", data)),
  delete: (id: string) => fetchJson<void>(`/apps/${id}`, opts("DELETE")),
};

export const system = {
  metrics: () => fetchJson<SystemMetrics>("/system"),
};

export interface AppLink {
  id: string;
  name: string;
  url: string;
  category: string;
  openInNewTab?: boolean;
}

export interface SystemMetrics {
  cpu: { usagePercent: number };
  memory: { usedBytes: number; totalBytes: number; usagePercent: number };
  temperature: { celsius: number; label: string } | null;
  uptimeSeconds: number;
  hostname: string;
  platform: string;
  loadAvg: number[];
}
