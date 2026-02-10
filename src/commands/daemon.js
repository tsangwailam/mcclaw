import chalk from 'chalk';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  saveDaemonInfo,
  getDaemonInfo,
  clearDaemonInfo,
  isProcessRunning,
  isDaemonHealthy,
  getDbUrl,
  loadConfig,
  saveConfig,
  DEFAULT_PORT,
} from '../lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

export async function daemonCommand(action, options) {
  switch (action) {
    case 'start':
      return startDaemon(options);
    case 'stop':
      return stopDaemon(options);
    case 'status':
      return daemonStatus(options);
    case 'restart':
      await stopDaemon(options);
      return startDaemon(options);
    default:
      console.error(chalk.red(`Unknown daemon action: ${action}`));
      console.log('Usage: mc daemon <start|stop|status|restart>');
      process.exit(1);
  }
}

function findProcessOnPort(port) {
  const pids = new Set();
  
  // Method 1: lsof
  try {
    const output = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (output) {
      output.split('\n').forEach(p => {
        const pid = parseInt(p);
        if (!isNaN(pid)) pids.add(pid);
      });
    }
  } catch {}
  
  // Method 2: ss + parse (more reliable on Linux)
  try {
    const output = execSync(`ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP 'pid=\\K[0-9]+' || true`, { encoding: 'utf-8' }).trim();
    if (output) {
      output.split('\n').forEach(p => {
        const pid = parseInt(p);
        if (!isNaN(pid)) pids.add(pid);
      });
    }
  } catch {}
  
  // Method 3: fuser
  try {
    const output = execSync(`fuser ${port}/tcp 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
    if (output) {
      output.split(/\s+/).forEach(p => {
        const pid = parseInt(p);
        if (!isNaN(pid)) pids.add(pid);
      });
    }
  } catch {}
  
  return [...pids];
}

function findRelatedProcesses(port) {
  const pids = new Set();
  
  // Find next-server processes
  try {
    const output = execSync(`pgrep -f "next-server" 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
    if (output) {
      output.split('\n').forEach(p => {
        const pid = parseInt(p);
        if (!isNaN(pid)) pids.add(pid);
      });
    }
  } catch {}
  
  // Find npm exec next processes  
  try {
    const output = execSync(`pgrep -f "npm.*next.*${port}" 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
    if (output) {
      output.split('\n').forEach(p => {
        const pid = parseInt(p);
        if (!isNaN(pid)) pids.add(pid);
      });
    }
  } catch {}
  
  return [...pids];
}

async function startDaemon(options) {
  const port = parseInt(options.port) || DEFAULT_PORT;
  const dbUrl = options.dbUrl || getDbUrl();
  
  // Check if already running on port
  if (await isDaemonHealthy(port)) {
    const { pid } = getDaemonInfo();
    console.log(chalk.yellow(`Daemon already running on port ${port}${pid ? ` (PID: ${pid})` : ''}`));
    return;
  }

  // Kill any stale processes
  await killDaemonProcesses(port);

  console.log(chalk.cyan(`Starting Mission Claw daemon on port ${port}...`));
  console.log(chalk.dim(`  Database: ${dbUrl.substring(0, 50)}${dbUrl.length > 50 ? '...' : ''}`));

  const child = spawn('node', ['src/server/index.js'], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    env: { 
      ...process.env, 
      PORT: String(port),
      MC_DATABASE_URL: dbUrl,
      DATABASE_URL: dbUrl,
    },
  });

  child.unref();
  saveDaemonInfo(child.pid, port);
  
  // Save the db URL used for this daemon
  const config = loadConfig();
  config.daemonDbUrl = dbUrl;
  saveConfig(config);

  // Wait for daemon to be healthy
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 500));
    if (await isDaemonHealthy(port)) {
      // Find actual server PID
      const pids = findProcessOnPort(port);
      const serverPid = pids.length > 0 ? pids[0] : child.pid;
      saveDaemonInfo(serverPid, port);
      
      console.log(chalk.green(`✓ Daemon started (PID: ${serverPid}, port: ${port})`));
      console.log(chalk.dim(`  API: http://localhost:${port}`));
      return;
    }
    attempts++;
  }

  console.error(chalk.red('Failed to start daemon (timeout)'));
  process.exit(1);
}

async function killDaemonProcesses(port) {
  const allPids = new Set([
    ...findProcessOnPort(port),
    ...findRelatedProcesses(port),
  ]);
  
  if (allPids.size === 0) return [];
  
  const killed = [];
  
  // SIGKILL all of them
  for (const pid of allPids) {
    try {
      process.kill(pid, 'SIGKILL');
      killed.push(pid);
    } catch {}
  }
  
  if (killed.length > 0) {
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return killed;
}

async function stopDaemon(options) {
  const { pid, port } = getDaemonInfo();
  const targetPort = parseInt(options?.port) || port || DEFAULT_PORT;
  
  // Check if anything is running
  const portPids = findProcessOnPort(targetPort);
  const relatedPids = findRelatedProcesses(targetPort);
  const hasSavedPid = pid && isProcessRunning(pid);
  
  const allPids = new Set([...portPids, ...relatedPids]);
  if (hasSavedPid) allPids.add(pid);
  
  if (allPids.size === 0 && !(await isDaemonHealthy(targetPort))) {
    console.log(chalk.yellow('Daemon not running'));
    clearDaemonInfo();
    return;
  }

  console.log(chalk.cyan(`Stopping daemon on port ${targetPort}...`));
  if (allPids.size > 0) {
    console.log(chalk.dim(`  PIDs: ${[...allPids].join(', ')}`));
  }
  
  // Kill all processes
  for (const p of allPids) {
    try { process.kill(p, 'SIGKILL'); } catch {}
  }
  
  // Wait and verify
  await new Promise(r => setTimeout(r, 1500));
  
  // Check if port is free now
  let remaining = findProcessOnPort(targetPort);
  let retries = 0;
  while (remaining.length > 0 && retries < 5) {
    console.log(chalk.dim(`  Retrying kill for PIDs: ${remaining.join(', ')}`));
    for (const p of remaining) {
      try { process.kill(p, 'SIGKILL'); } catch {}
    }
    await new Promise(r => setTimeout(r, 500));
    remaining = findProcessOnPort(targetPort);
    retries++;
  }
  
  if (remaining.length > 0 || await isDaemonHealthy(targetPort)) {
    console.log(chalk.red(`Failed to stop daemon completely`));
    console.log(chalk.dim(`  Try manually: kill -9 ${remaining.join(' ')}`));
  } else {
    console.log(chalk.green(`✓ Daemon stopped`));
  }
  
  clearDaemonInfo();
}

async function daemonStatus(options) {
  const { pid, port } = getDaemonInfo();
  const targetPort = parseInt(options?.port) || port || DEFAULT_PORT;
  
  const healthy = await isDaemonHealthy(targetPort);
  const pids = findProcessOnPort(targetPort);
  const config = loadConfig();

  if (healthy) {
    const serverPid = pids.length > 0 ? pids[0] : pid;
    console.log(chalk.green(`Daemon: running (Headless API)`));
    console.log(chalk.dim(`  PID: ${serverPid || 'unknown'}`));
    console.log(chalk.dim(`  Port: ${targetPort}`));
    console.log(chalk.dim(`  URL: http://localhost:${targetPort}`));
    if (config.daemonDbUrl) {
      console.log(chalk.dim(`  Database: ${config.daemonDbUrl.substring(0, 40)}...`));
    }
    
    // Warn if PID file is missing/stale
    if (!pid || !isProcessRunning(pid)) {
      console.log(chalk.yellow(`  ⚠ PID file missing or stale`));
    }
  } else if (pids.length > 0) {
    console.log(chalk.yellow(`Daemon: process on port ${targetPort} but not responding`));
    console.log(chalk.dim(`  PIDs: ${pids.join(', ')}`));
    console.log(chalk.dim(`  Try: mc daemon stop`));
  } else {
    console.log(chalk.yellow('Daemon: not running'));
    if (pid) {
      console.log(chalk.dim(`  Stale PID file cleaned up`));
    }
    clearDaemonInfo();
  }
}
