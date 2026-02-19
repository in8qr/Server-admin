import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { apps, system, type AppLink, type SystemMetrics } from "../api/client";

const POLL_MS = 2500;

function formatBytes(n: number) {
  const g = 1024 ** 3;
  const m = 1024 ** 2;
  if (n >= g) return `${(n / g).toFixed(1)} GB`;
  if (n >= m) return `${(n / m).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function formatUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [links, setLinks] = useState<AppLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", category: "General", openInNewTab: true });

  const loadMetrics = useCallback(async () => {
    try {
      const m = await system.metrics();
      setMetrics(m);
    } catch {
      setMetrics(null);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    try {
      const list = await apps.list();
      setLinks(list);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    loadLinks();
  }, [loadMetrics, loadLinks]);

  useEffect(() => {
    const t = setInterval(loadMetrics, POLL_MS);
    return () => clearInterval(t);
  }, [loadMetrics]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apps.create(form);
      setForm({ name: "", url: "", category: "General", openInNewTab: true });
      setAddOpen(false);
      loadLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      await apps.update(editId, form);
      setEditId(null);
      setForm({ name: "", url: "", category: "General", openInNewTab: true });
      loadLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this link?")) return;
    try {
      await apps.delete(id);
      loadLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  function openEdit(link: AppLink) {
    setForm({
      name: link.name,
      url: link.url,
      category: link.category,
      openInNewTab: link.openInNewTab !== false,
    });
    setEditId(link.id);
  }

  const byCategory = links.reduce<Record<string, AppLink[]>>((acc, link) => {
    const c = link.category || "General";
    if (!acc[c]) acc[c] = [];
    acc[c].push(link);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0f1116]">
      <header className="border-b border-white/5 bg-panel/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Mjsrvr</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{user}</span>
            <button
              onClick={() => logout()}
              className="text-sm text-muted hover:text-white transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MetricCard
            title="CPU"
            value={metrics ? `${metrics.cpu.usagePercent}%` : "—"}
            subtitle={metrics?.loadAvg ? `Load ${metrics.loadAvg.map((l) => l.toFixed(1)).join(" / ")}` : ""}
          />
          <MetricCard
            title="Memory"
            value={
              metrics && metrics.memory.totalBytes > 0
                ? `${metrics.memory.usagePercent}%`
                : "—"
            }
            subtitle={
              metrics && metrics.memory.totalBytes > 0
                ? `${formatBytes(metrics.memory.usedBytes)} / ${formatBytes(metrics.memory.totalBytes)}`
                : ""
            }
          />
          <MetricCard
            title="Temperature"
            value={
              metrics?.temperature != null
                ? `${metrics.temperature.celsius}°C`
                : "N/A"
            }
            subtitle={metrics?.temperature?.label ?? ""}
          />
          <MetricCard
            title="Uptime"
            value={metrics ? formatUptime(metrics.uptimeSeconds) : "—"}
            subtitle={metrics?.hostname ?? ""}
          />
        </section>

        {/* App links */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">App links</h2>
            <button
              onClick={() => {
                setAddOpen(true);
                setEditId(null);
                setForm({ name: "", url: "", category: "General", openInNewTab: true });
              }}
              className="rounded-lg bg-accent hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 transition"
            >
              Add link
            </button>
          </div>

          {addOpen && (
            <form
              onSubmit={handleAdd}
              className="rounded-xl bg-surface border border-white/5 p-4 mb-4 flex flex-wrap gap-3 items-end"
            >
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white w-40"
                required
              />
              <input
                placeholder="URL"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white flex-1 min-w-[200px]"
                required
              />
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white w-32"
              />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(e) => setForm((f) => ({ ...f, openInNewTab: e.target.checked }))}
                  className="rounded"
                />
                New tab
              </label>
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-white text-sm">
                Save
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-muted text-sm hover:bg-white/5"
              >
                Cancel
              </button>
            </form>
          )}

          {editId && (
            <form
              onSubmit={handleUpdate}
              className="rounded-xl bg-surface border border-white/5 p-4 mb-4 flex flex-wrap gap-3 items-end"
            >
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white w-40"
                required
              />
              <input
                placeholder="URL"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white flex-1 min-w-[200px]"
                required
              />
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-lg bg-panel border border-white/10 px-3 py-2 text-white w-32"
              />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(e) => setForm((f) => ({ ...f, openInNewTab: e.target.checked }))}
                  className="rounded"
                />
                New tab
              </label>
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-white text-sm">
                Update
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-muted text-sm hover:bg-white/5"
              >
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-muted">Loading links…</p>
          ) : Object.keys(byCategory).length === 0 ? (
            <p className="text-muted">No links yet. Add one above.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted mb-2">{category}</h3>
                  <div className="flex flex-wrap gap-3">
                    {items.map((link) => (
                      <div
                        key={link.id}
                        className="rounded-xl bg-surface border border-white/5 p-4 min-w-[200px] group"
                      >
                        <a
                          href={link.url}
                          target={link.openInNewTab !== false ? "_blank" : undefined}
                          rel={link.openInNewTab !== false ? "noopener noreferrer" : undefined}
                          className="block font-medium text-white hover:text-accent transition truncate"
                        >
                          {link.name}
                        </a>
                        <p className="text-xs text-muted truncate mt-0.5">{link.url}</p>
                        <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => openEdit(link)}
                            className="text-xs text-muted hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(link.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl bg-surface border border-white/5 p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      {subtitle && <p className="text-sm text-muted mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}
