import chalk from 'chalk';
import { exec, spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  getDaemonInfo, 
  isDaemonHealthy, 
  getDashboardInfo, 
  saveDashboardInfo,
  clearDashboardInfo,
  isProcessRunning,
  DEFAULT_DASHBOARD_PORT 
} from '../lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

export async function dashboardCommand(action, options) {
  // Default action is 'start' (or just opening browser if already running)
  const act = action || 'start';

  switch (act) {
    case 'start':
      return startDashboard(options);
    case 'stop':
      return stopDashboard(options);
    case 'status':
      return dashboardStatus(options);
    default:
      console.error(chalk.red(`Unknown dashboard action: ${act}`));
      process.exit(1);
  }
}

async function startDashboard(options) {
  const { port: apiPort } = getDaemonInfo();
  const { pid: dashPid, port: dashPort } = getDashboardInfo();
  
  // 1. Ensure API is running
  if (!(await isDaemonHealthy(apiPort))) {
    console.error(chalk.red('API Daemon not running. Start it with: mclaw daemon start'));
    process.exit(1);
  }

  // 2. Check if dashboard already running
  let isRunning = false;
  if (dashPid && isProcessRunning(dashPid)) {
    try {
      const res = await fetch(`http://localhost:${dashPort}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) isRunning = true;
    } catch {}
  }

  if (!isRunning) {
    console.log(chalk.cyan(`Starting Mission Claw dashboard on port ${dashPort}...`));
    
    const child = spawn('npx', ['next', 'start', '-p', String(dashPort)], {
      cwd: rootDir,
      detached: true,
      stdio: 'ignore',
      env: { 
        ...process.env, 
        PORT: String(dashPort),
        MC_API_PORT: String(apiPort)
      },
    });

    child.unref();
    saveDashboardInfo(child.pid, dashPort);

    // Wait for dashboard to be healthy
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch(`http://localhost:${dashPort}/api/health`, { signal: AbortSignal.timeout(500) });
        if (res.ok) {
          isRunning = true;
          break;
        }
      } catch {}
      attempts++;
    }

    if (!isRunning) {
      console.error(chalk.red('Failed to start dashboard (timeout)'));
      process.exit(1);
    }
  }

  const url = `http://localhost:${dashPort}`;
  console.log(chalk.green(`✓ Dashboard ready: ${url}`));

  // Cross-platform open
  if (!options.noOpen) {
    const cmd = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
    
    exec(`${cmd} ${url}`, (err) => {
      if (err) {
        console.log(chalk.dim(`  Visit: ${url}`));
      }
    });
  }
}

async function stopDashboard() {
  const { pid, port } = getDashboardInfo();
  
  if (!pid || !isProcessRunning(pid)) {
    console.log(chalk.yellow('Dashboard not running'));
    clearDashboardInfo();
    return;
  }

  console.log(chalk.cyan(`Stopping dashboard on port ${port}...`));
  
  // Try to find all related processes (Next.js spawns children)
  try {
    const pids = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: 'utf-8' }).trim().split('\n');
    for (const p of pids) {
      if (p) process.kill(parseInt(p), 'SIGKILL');
    }
  } catch {}

  try {
    process.kill(pid, 'SIGKILL');
  } catch {}
  
  clearDashboardInfo();
  console.log(chalk.green('✓ Dashboard stopped'));
}

async function dashboardStatus() {
  const { pid, port } = getDashboardInfo();
  const healthy = dashPidIsHealthy(port);

  if (healthy) {
    console.log(chalk.green('Dashboard: running'));
    console.log(chalk.dim(`  Port: ${port}`));
    console.log(chalk.dim(`  URL: http://localhost:${port}`));
  } else {
    console.log(chalk.yellow('Dashboard: not running'));
  }
}

async function dashPidIsHealthy(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(500) });
    return res.ok;
  } catch {
    return false;
  }
}
