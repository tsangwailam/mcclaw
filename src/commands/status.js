import chalk from 'chalk';
import { getDaemonInfo, isDaemonHealthy, getApiUrl, getDbProvider, getDbUrl, getDashboardInfo, isProcessRunning } from '../lib/config.js';
import { createPrismaClient } from '../lib/db.js';

function getActivityTime(act) {
  return act.createdAt || act.timestamp;
}

function redactDbUrl(url) {
  if (!url) return 'N/A';
  if (url.startsWith('file:')) {
    // SQLite - show path but truncate middle if long
    const path = url.replace('file:', '');
    if (path.length > 40) {
      return 'file:...' + path.slice(-30);
    }
    return url;
  }
  // PostgreSQL/other - redact credentials
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    if (parsed.username) parsed.username = parsed.username.slice(0, 2) + '***';
    return parsed.toString();
  } catch {
    return url.slice(0, 15) + '...';
  }
}

async function printServiceStatus() {
  console.log(chalk.bold.cyan('\n🖥  Service Status\n'));

  // Daemon status
  const { pid: daemonPid, port: daemonPort } = getDaemonInfo();
  const daemonPidAlive = daemonPid && isProcessRunning(daemonPid);
  const daemonHealthy = await isDaemonHealthy(daemonPort);
  const daemonRunning = daemonPidAlive || daemonHealthy;
  const daemonStatus = daemonRunning
    ? chalk.green('● Running') + chalk.dim(` (${daemonPidAlive ? `PID: ${daemonPid}, ` : ''}Port: ${daemonPort})`)
    : chalk.red('○ Stopped');
  console.log(`  Daemon:     ${daemonStatus}`);

  // Dashboard status
  const { pid: dashPid, port: dashPort } = getDashboardInfo();
  const dashRunning = dashPid && isProcessRunning(dashPid);
  const dashStatus = dashRunning
    ? chalk.green('● Running') + chalk.dim(` (PID: ${dashPid}, Port: ${dashPort})`)
    : chalk.red('○ Stopped');
  console.log(`  Dashboard:  ${dashStatus}`);

  // Database info
  const dbUrl = getDbUrl();
  const provider = getDbProvider(dbUrl);
  console.log(`  Database:   ${chalk.yellow(provider)} ${chalk.dim(redactDbUrl(dbUrl))}`);
}

export async function statusCommand(options) {
  // Always print service status first
  await printServiceStatus();

  // If --db-url provided, use direct database access
  if (options?.dbUrl) {
    return statusDirect(options);
  }

  // Otherwise use daemon API
  const { port } = getDaemonInfo();
  
  if (!(await isDaemonHealthy(port))) {
    console.log(chalk.dim('\n  Daemon not running — activity stats unavailable.'));
    console.log(chalk.dim('  Start with: mclaw daemon start\n'));
    return;
  }

  try {
    const res = await fetch(`${getApiUrl(port)}/api/activity/stats`);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to get stats');
    }

    const stats = await res.json();
    printStats(stats);
  } catch (error) {
    console.error(chalk.red('Error getting status:'), error.message);
    process.exit(1);
  }
}

async function statusDirect(options) {
  try {
    const prisma = await createPrismaClient(options.dbUrl);
    const provider = getDbProvider(options.dbUrl);
    const dateField = provider === 'postgresql' ? 'timestamp' : 'createdAt';

    const total = await prisma.activity.count();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.activity.count({
      where: { [dateField]: { gte: today } }
    });

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekCount = await prisma.activity.count({
      where: { [dateField]: { gte: lastWeek } }
    });

    const byStatus = await prisma.activity.groupBy({
      by: ['status'],
      _count: true,
    });

    const byAgent = await prisma.activity.groupBy({
      by: ['agent'],
      _count: true,
      orderBy: { _count: { agent: 'desc' } },
      take: 5,
    });

    const byProject = await prisma.activity.groupBy({
      by: ['project'],
      _count: true,
      orderBy: { _count: { project: 'desc' } },
      take: 5,
    });

    const recent = await prisma.activity.findFirst({
      orderBy: { [dateField]: 'desc' },
    });

    printStats({
      total,
      today: todayCount,
      week: weekCount,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byAgent: byAgent.filter(a => a.agent).map(a => ({ agent: a.agent, count: a._count })),
      byProject: byProject.filter(p => p.project).map(p => ({ project: p.project, count: p._count })),
      recent,
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error(chalk.red('Error getting status:'), error.message);
    process.exit(1);
  }
}

function printStats(stats) {
  console.log(chalk.bold.cyan('\n📊 Mission Claw Status\n'));
  
  console.log(chalk.bold('Activity Counts:'));
  console.log(`  Total:      ${chalk.green(stats.total)}`);
  console.log(`  Today:      ${chalk.green(stats.today)}`);
  console.log(`  This week:  ${chalk.green(stats.week)}`);

  if (stats.byStatus?.length > 0) {
    console.log(chalk.bold('\nBy Status:'));
    for (const s of stats.byStatus) {
      const icon = s.status === 'completed' ? '✓' : s.status === 'failed' ? '✗' : '◐';
      console.log(`  ${icon} ${s.status || 'unknown'}: ${s.count}`);
    }
  }

  if (stats.byAgent?.length > 0) {
    console.log(chalk.bold('\nTop Agents:'));
    for (const a of stats.byAgent) {
      console.log(`  • ${a.agent}: ${a.count}`);
    }
  }

  if (stats.byProject?.length > 0) {
    console.log(chalk.bold('\nTop Projects:'));
    for (const p of stats.byProject) {
      console.log(`  • ${p.project}: ${p.count}`);
    }
  }

  if (stats.recent) {
    console.log(chalk.bold('\nMost Recent:'));
    console.log(`  ${chalk.dim(new Date(getActivityTime(stats.recent)).toLocaleString())}`);
    console.log(`  ${stats.recent.action}`);
    if (stats.recent.agent) console.log(`  ${chalk.dim('Agent:')} ${stats.recent.agent}`);
  }

  console.log('');
}
