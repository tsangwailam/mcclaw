#!/usr/bin/env node

import { program } from 'commander';
import { logCommand } from '../src/commands/log.js';
import { listCommand } from '../src/commands/list.js';
import { statusCommand } from '../src/commands/status.js';
import { dashboardCommand } from '../src/commands/dashboard.js';
import { daemonCommand } from '../src/commands/daemon.js';
import { configCommand } from '../src/commands/config.js';

program
  .name('mclaw')
  .description('Mission Claw - Activity logging CLI with daemon-based architecture')
  .version('1.0.0');

// mc daemon start|stop|status
program
  .command('daemon <action>')
  .description('Manage the daemon (start|stop|status|restart)')
  .option('--port <port>', 'Port for daemon', '3100')
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action(daemonCommand);

// mc log "action" --details "..." --agent X --project Y --status completed --duration "1m 30s"
program
  .command('log <action>')
  .description('Log an activity')
  .option('-d, --details <details>', 'Activity details')
  .option('-a, --agent <agent>', 'Agent name')
  .option('-p, --project <project>', 'Project name')
  .option('-s, --status <status>', 'Status (completed|in_progress|failed)', 'completed')
  .option('--duration <duration>', 'Duration (e.g., "1m 30s")')
  .option('--input-tokens <n>', 'Input tokens', parseInt)
  .option('--output-tokens <n>', 'Output tokens', parseInt)
  .option('--total-tokens <n>', 'Total tokens', parseInt)
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action(logCommand);

// mc list [--agent X] [--project Y] [--status Z] [--limit N]
program
  .command('list')
  .description('List activities')
  .option('-a, --agent <agent>', 'Filter by agent')
  .option('-p, --project <project>', 'Filter by project')
  .option('-s, --status <status>', 'Filter by status')
  .option('-l, --limit <n>', 'Limit results', parseInt, 20)
  .option('--json', 'Output as JSON')
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action(listCommand);

// mc status
program
  .command('status')
  .description('Show quick stats')
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action(statusCommand);

// mc restart
program
  .command('restart')
  .description('Restart the daemon')
  .option('--port <port>', 'Port for daemon', '3100')
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action((options) => daemonCommand('restart', options));

// mc dashboard [start|stop|status]
program
  .command('dashboard [action]')
  .description('Manage the web dashboard (start|stop|status)')
  .option('--no-open', 'Don\'t open browser automatically')
  .action(dashboardCommand);

// mc config set|get|show
program
  .command('config <action> [key]')
  .description('Manage configuration (set|get|show)')
  .option('--db-url <url>', 'Database URL to set')
  .action(configCommand);

// mc migrate - run migrations
program
  .command('migrate')
  .description('Run database migrations')
  .option('--db-url <url>', 'Database URL (postgresql:// or file:)')
  .action(async (options) => {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    const { getDbUrl, getDbProvider } = await import('../src/lib/config.js');
    const chalk = (await import('chalk')).default;
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const rootDir = join(__dirname, '..');
    
    const url = options.dbUrl || getDbUrl();
    const provider = getDbProvider(url);
    const schema = provider === 'postgresql' 
      ? 'prisma/schema.postgresql.prisma' 
      : 'prisma/schema.prisma';
    
    console.log(chalk.cyan(`Running migrations for ${provider}...`));
    
    try {
      execSync(`npx prisma migrate deploy --schema=${schema}`, {
        cwd: rootDir,
        env: { ...process.env, DATABASE_URL: url },
        stdio: 'inherit',
      });
      console.log(chalk.green('✓ Migrations complete'));
    } catch (err) {
      console.error(chalk.red('Migration failed'));
      process.exit(1);
    }
  });

program.parse();
