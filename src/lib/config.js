import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const MC_DIR = join(homedir(), '.mc');
const PID_FILE = join(MC_DIR, 'daemon.pid');
const PORT_FILE = join(MC_DIR, 'daemon.port');
const DASHBOARD_PID_FILE = join(MC_DIR, 'dashboard.pid');
const DASHBOARD_PORT_FILE = join(MC_DIR, 'dashboard.port');
const CONFIG_FILE = join(MC_DIR, 'config.json');

export const DEFAULT_PORT = 3101;
export const DEFAULT_DASHBOARD_PORT = 3100;
const DEFAULT_SQLITE_PATH = join(MC_DIR, 'data', 'mclaw.db');

export function ensureMcDir() {
  if (!existsSync(MC_DIR)) {
    mkdirSync(MC_DIR, { recursive: true });
  }
}

// ============ Config Management ============

export function loadConfig() {
  ensureMcDir();
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

export function saveConfig(config) {
  ensureMcDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getDbUrl(cliDbUrl) {
  // Priority: CLI flag > env var > config file > default SQLite
  if (cliDbUrl) return cliDbUrl;
  if (process.env.MC_DATABASE_URL) return process.env.MC_DATABASE_URL;
  
  const config = loadConfig();
  if (config.databaseUrl) return config.databaseUrl;
  
  // Default to SQLite
  const dataDir = join(MC_DIR, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return `file:${DEFAULT_SQLITE_PATH}`;
}

export function getDbProvider(url) {
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'postgresql';
  }
  return 'sqlite';
}

// ============ Daemon Management ============

export function saveDaemonInfo(pid, port) {
  ensureMcDir();
  writeFileSync(PID_FILE, String(pid));
  writeFileSync(PORT_FILE, String(port));
}

export function getDaemonInfo() {
  try {
    const pid = existsSync(PID_FILE) ? parseInt(readFileSync(PID_FILE, 'utf-8').trim()) : null;
    const port = existsSync(PORT_FILE) ? parseInt(readFileSync(PORT_FILE, 'utf-8').trim()) : DEFAULT_PORT;
    return { pid, port };
  } catch {
    return { pid: null, port: DEFAULT_PORT };
  }
}

export function clearDaemonInfo() {
  try {
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE);
  } catch {}
}

export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function isDaemonHealthy(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, { 
      signal: AbortSignal.timeout(2000) 
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getApiUrl(port) {
  return `http://localhost:${port || DEFAULT_PORT}`;
}

export function saveDashboardInfo(pid, port) {
  ensureMcDir();
  writeFileSync(DASHBOARD_PID_FILE, String(pid));
  writeFileSync(DASHBOARD_PORT_FILE, String(port));
}

export function getDashboardInfo() {
  try {
    const pid = existsSync(DASHBOARD_PID_FILE) ? parseInt(readFileSync(DASHBOARD_PID_FILE, 'utf-8').trim()) : null;
    const port = existsSync(DASHBOARD_PORT_FILE) ? parseInt(readFileSync(DASHBOARD_PORT_FILE, 'utf-8').trim()) : DEFAULT_DASHBOARD_PORT;
    return { pid, port };
  } catch {
    return { pid: null, port: DEFAULT_DASHBOARD_PORT };
  }
}

export function clearDashboardInfo() {
  try {
    if (existsSync(DASHBOARD_PID_FILE)) unlinkSync(DASHBOARD_PID_FILE);
    if (existsSync(DASHBOARD_PORT_FILE)) unlinkSync(DASHBOARD_PORT_FILE);
  } catch {}
}
