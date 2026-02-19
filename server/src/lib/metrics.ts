import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

export interface SystemMetrics {
  cpu: { usagePercent: number };
  memory: { usedBytes: number; totalBytes: number; usagePercent: number };
  temperature: { celsius: number | null; label: string } | null;
  uptimeSeconds: number;
  hostname: string;
  platform: string;
  loadAvg: number[];
}

// CPU usage on Linux is relative to previous sample (/proc/stat). We need two samples.
let prevCpu: { total: number; idle: number } | null = null;

function getCpuUsageFromProc(): number {
  try {
    const stat = readFileSync("/proc/stat", "utf-8");
    const line = stat.split("\n")[0];
    const parts = line?.split(/\s+/);
    if (!parts || parts[0] !== "cpu") return 0;
    const user = Number(parts[1]) ?? 0;
    const nice = Number(parts[2]) ?? 0;
    const system = Number(parts[3]) ?? 0;
    const idle = Number(parts[4]) ?? 0;
    const iowait = Number(parts[5]) ?? 0;
    const irq = Number(parts[6]) ?? 0;
    const softirq = Number(parts[7]) ?? 0;
    const steal = Number(parts[8]) ?? 0;
    const total = user + nice + system + idle + iowait + irq + softirq + steal;
    const idleTotal = idle + iowait;
    if (prevCpu !== null) {
      const dTotal = total - prevCpu.total;
      const dIdle = idleTotal - prevCpu.idle;
      prevCpu = { total, idle: idleTotal };
      if (dTotal === 0) return 0;
      return Math.round((100 * (1 - dIdle / dTotal)) * 10) / 10;
    }
    prevCpu = { total, idle: idleTotal };
    return 0;
  } catch {
    return 0;
  }
}

function getMemory(): { usedBytes: number; totalBytes: number; usagePercent: number } {
  try {
    if (existsSync("/proc/meminfo")) {
      const mem = readFileSync("/proc/meminfo", "utf-8");
      let memTotal = 0,
        memAvailable = 0;
      for (const line of mem.split("\n")) {
        const [key, value] = line.split(/\s*:\s*/);
        const kb = parseInt(value?.split(/\s/)[0] ?? "0", 10);
        if (key === "MemTotal") memTotal = kb * 1024;
        if (key === "MemAvailable") memAvailable = kb * 1024;
      }
      const usedBytes = memTotal - memAvailable;
      const usagePercent =
        memTotal > 0 ? Math.round((100 * usedBytes) / memTotal * 10) / 10 : 0;
      return { usedBytes, totalBytes: memTotal, usagePercent };
    }
  } catch {
    // fallback
  }
  return { usedBytes: 0, totalBytes: 0, usagePercent: 0 };
}

function getTemperature(): { celsius: number; label: string } | null {
  try {
    const out = execSync("sensors -j 2>/dev/null || true", {
      encoding: "utf-8",
      maxBuffer: 8192,
    });
    if (!out?.trim()) return null;
    const j = JSON.parse(out) as Record<string, unknown>;
    for (const chipName of Object.keys(j)) {
      const chip = j[chipName] as Record<string, unknown>;
      if (!chip || typeof chip !== "object") continue;
      for (const key of Object.keys(chip)) {
        if (key === "Adapter") continue;
        const val = chip[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const sub = val as Record<string, unknown>;
          for (const [k, v] of Object.entries(sub)) {
            if (/temp\d+_input/.test(k) && typeof v === "number") {
              return { celsius: Math.round(v * 10) / 10, label: key };
            }
          }
        }
      }
    }
  } catch {
    // no sensors or parse error
  }
  return null;
}

function getUptime(): number {
  try {
    if (existsSync("/proc/uptime")) {
      const line = readFileSync("/proc/uptime", "utf-8");
      const seconds = parseFloat(line?.split(/\s/)[0] ?? "0");
      return Math.floor(seconds);
    }
  } catch {
    //
  }
  return 0;
}

function getLoadAvg(): number[] {
  try {
    if (existsSync("/proc/loadavg")) {
      const line = readFileSync("/proc/loadavg", "utf-8");
      const parts = line?.trim().split(/\s+/);
      if (parts && parts.length >= 3) {
        return [
          parseFloat(parts[0]) ?? 0,
          parseFloat(parts[1]) ?? 0,
          parseFloat(parts[2]) ?? 0,
        ];
      }
    }
  } catch {
    //
  }
  return [0, 0, 0];
}

export function getSystemMetrics(): SystemMetrics {
  const platform = process.platform;
  const hostname = process.env.HOSTNAME ?? "localhost";
  const cpuUsage = platform === "linux" ? getCpuUsageFromProc() : 0;
  const memory =
    platform === "linux"
      ? getMemory()
      : { usedBytes: 0, totalBytes: 0, usagePercent: 0 };
  const temperature = platform === "linux" ? getTemperature() : null;
  const uptimeSeconds = platform === "linux" ? getUptime() : 0;
  const loadAvg = platform === "linux" ? getLoadAvg() : [0, 0, 0];

  return {
    cpu: { usagePercent: cpuUsage },
    memory,
    temperature,
    uptimeSeconds,
    hostname,
    platform,
    loadAvg,
  };
}
