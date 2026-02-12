import chalk from 'chalk';
import Table from 'cli-table3';
import { getDaemonInfo, isDaemonHealthy, getApiUrl, getDbProvider } from '../lib/config.js';
import { createPrismaClient } from '../lib/db.js';
import { getActivityTime } from '../lib/utils.js';

function formatNumber(n) {
  return n?.toLocaleString() ?? '—';
}

export async function listCommand(options) {
  // If --db-url provided, use direct database access
  if (options.dbUrl) {
    return listDirect(options);
  }

  // Otherwise use daemon API
  const { port } = getDaemonInfo();
  
  if (!(await isDaemonHealthy(port))) {
    console.error(chalk.red('Daemon not running. Start it with: mclaw daemon start'));
    console.error(chalk.dim('Or use --db-url for direct database access'));
    process.exit(1);
  }

  try {
    const params = new URLSearchParams();
    if (options.agent) params.set('agent', options.agent);
    if (options.project) params.set('project', options.project);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));

    const url = `${getApiUrl(port)}/api/activity${params.toString() ? '?' + params : ''}`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to list activities');
    }

    const data = await res.json();
    printActivities(data.activities || [], options);
  } catch (error) {
    console.error(chalk.red('Error listing activities:'), error.message);
    process.exit(1);
  }
}

async function listDirect(options) {
  try {
    const prisma = await createPrismaClient(options.dbUrl);
    const provider = getDbProvider(options.dbUrl);
    
    const where = {};
    if (options.agent) where.agent = options.agent;
    if (options.project) where.project = options.project;
    if (options.status) where.status = options.status;

    // Use appropriate date field based on provider
    const orderField = provider === 'postgresql' ? 'timestamp' : 'createdAt';
    
    const activities = await prisma.activity.findMany({
      where,
      orderBy: { [orderField]: 'desc' },
      take: options.limit || 20,
    });

    printActivities(activities, options);
    await prisma.$disconnect();
  } catch (error) {
    console.error(chalk.red('Error listing activities:'), error.message);
    process.exit(1);
  }
}

function printActivities(activities, options) {
  if (options.json) {
    console.log(JSON.stringify(activities, null, 2));
    return;
  }

  if (activities.length === 0) {
    console.log(chalk.yellow('No activities found.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Action'),
      chalk.cyan('Status'),
      chalk.cyan('Agent'),
      chalk.cyan('Project'),
      chalk.cyan('Duration'),
      chalk.cyan('Tokens'),
      chalk.cyan('Time'),
    ],
    colWidths: [6, 26, 12, 8, 12, 10, 10, 16],
    wordWrap: true,
  });

  for (const act of activities) {
    const statusColor = act.status === 'completed' ? chalk.green :
                        act.status === 'failed' ? chalk.red :
                        chalk.yellow;
    
    // Handle both id types (string cuid or integer)
    const displayId = typeof act.id === 'string' ? act.id.substring(0, 4) : act.id;
    
    table.push([
      displayId,
      act.action.substring(0, 24),
      statusColor(act.status || 'unknown'),
      act.agent || '—',
      act.project?.substring(0, 10) || '—',
      act.duration || '—',
      formatNumber(act.totalTokens),
      new Date(getActivityTime(act)).toLocaleString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nShowing ${activities.length} activities`));
}
