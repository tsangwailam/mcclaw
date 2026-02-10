import chalk from 'chalk';
import { getDaemonInfo, isDaemonHealthy, getApiUrl, getDbProvider } from '../lib/config.js';
import { getPrisma } from '../lib/db.js';
import { toCamelCase } from '../lib/utils.js';

function formatNumber(n) {
  return n?.toLocaleString() ?? null;
}

export async function logCommand(action, options) {
  // If --db-url provided, use direct database access
  if (options.dbUrl) {
    return logDirect(action, options);
  }

  // Otherwise use daemon API
  const { port } = getDaemonInfo();
  
  if (!(await isDaemonHealthy(port))) {
    console.error(chalk.red('Daemon not running. Start it with: mc daemon start'));
    console.error(chalk.dim('Or use --db-url for direct database access'));
    process.exit(1);
  }

  try {
    const res = await fetch(`${getApiUrl(port)}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        details: options.details || action,
        agent: options.agent || null,
        project: toCamelCase(options.project) || null,
        status: options.status || 'completed',
        duration: options.duration || null,
        inputTokens: options.inputTokens || null,
        outputTokens: options.outputTokens || null,
        totalTokens: options.totalTokens || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to log activity');
    }

    const activity = await res.json();
    printSuccess(action, activity);
  } catch (error) {
    console.error(chalk.red('Error logging activity:'), error.message);
    process.exit(1);
  }
}

async function logDirect(action, options) {
  try {
    const prisma = await getPrisma(options.dbUrl);
    
    const agent = options.agent || null;
    const project = toCamelCase(options.project) || null;
    const status = options.status || 'completed';

    // If a log request comes in for an action/agent/project combination 
    // that already has an in_progress entry, update that entry
    if (status !== 'in_progress') {
      const existingInProgress = await prisma.activity.findFirst({
        where: {
          action,
          agent,
          project,
          status: 'in_progress',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingInProgress) {
        const activity = await prisma.activity.update({
          where: { id: existingInProgress.id },
          data: {
            status,
            details: options.details || existingInProgress.details,
            duration: options.duration || existingInProgress.duration,
            inputTokens: options.inputTokens || existingInProgress.inputTokens,
            outputTokens: options.outputTokens || existingInProgress.outputTokens,
            totalTokens: options.totalTokens || existingInProgress.totalTokens,
          },
        });
        printSuccess(action, activity);
        await prisma.$disconnect();
        return;
      }
    }

    const data = {
      action,
      details: options.details || action,
      agent,
      project,
      status,
      duration: options.duration || null,
      inputTokens: options.inputTokens || null,
      outputTokens: options.outputTokens || null,
      totalTokens: options.totalTokens || null,
    };

    const activity = await prisma.activity.create({ data });

    printSuccess(action, activity);
    await prisma.$disconnect();
  } catch (error) {
    console.error(chalk.red('Error logging activity:'), error.message);
    process.exit(1);
  }
}

function printSuccess(action, activity) {
  // Handle both id types
  const displayId = typeof activity.id === 'string' ? activity.id.substring(0, 8) : activity.id;
  
  console.log(chalk.green('✓') + ` Activity logged: ${chalk.bold(action)}`);
  console.log(chalk.dim(`  ID: ${displayId} | Status: ${activity.status}`));
  
  const meta = [];
  if (activity.agent) meta.push(`Agent: ${activity.agent}`);
  if (activity.project) meta.push(`Project: ${activity.project}`);
  if (meta.length > 0) console.log(chalk.dim(`  ${meta.join(' | ')}`));
  
  const metrics = [];
  if (activity.duration) metrics.push(`Duration: ${activity.duration}`);
  if (activity.totalTokens) {
    let tokenStr = `Tokens: ${formatNumber(activity.totalTokens)}`;
    if (activity.inputTokens && activity.outputTokens) {
      tokenStr += ` (${formatNumber(activity.inputTokens)} in / ${formatNumber(activity.outputTokens)} out)`;
    }
    metrics.push(tokenStr);
  }
  if (metrics.length > 0) console.log(chalk.dim(`  ${metrics.join(' | ')}`));
}
