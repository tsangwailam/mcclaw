import chalk from 'chalk';
import { loadConfig, saveConfig, getDbUrl, getDbProvider } from '../lib/config.js';

export async function configCommand(action, key, options) {
  switch (action) {
    case 'set':
      return setConfig(options);
    case 'get':
      return getConfig(key);
    case 'show':
      return showConfig();
    default:
      console.error(chalk.red(`Unknown config action: ${action}`));
      console.log('Usage: mclaw config <set|get|show>');
      console.log('  mc config set --db-url "postgresql://..."');
      console.log('  mc config get db-url');
      console.log('  mc config show');
      process.exit(1);
  }
}

function setConfig(options) {
  const config = loadConfig();
  
  if (options?.dbUrl) {
    config.databaseUrl = options.dbUrl;
    console.log(chalk.green('✓') + ` Database URL set`);
    console.log(chalk.dim(`  ${options.dbUrl.substring(0, 50)}${options.dbUrl.length > 50 ? '...' : ''}`));
  } else {
    console.log(chalk.yellow('No options provided. Use --db-url to set database URL.'));
    return;
  }
  
  saveConfig(config);
}

function getConfig(key) {
  const config = loadConfig();
  
  if (key === 'db-url' || key === 'database-url') {
    const url = getDbUrl();
    console.log(url);
  } else if (key) {
    console.log(config[key] ?? '');
  } else {
    console.log(JSON.stringify(config, null, 2));
  }
}

function showConfig() {
  const config = loadConfig();
  const effectiveUrl = getDbUrl();
  const provider = getDbProvider(effectiveUrl);
  
  console.log(chalk.bold.cyan('\n⚙️  Mission Claw Configuration\n'));
  
  console.log(chalk.bold('Database:'));
  console.log(`  Provider:  ${chalk.green(provider)}`);
  console.log(`  URL:       ${chalk.dim(effectiveUrl.length > 60 ? effectiveUrl.substring(0, 60) + '...' : effectiveUrl)}`);
  
  const source = process.env.MC_DATABASE_URL ? 'MC_DATABASE_URL env' :
                 config.databaseUrl ? '~/.mc/config.json' : 'default (SQLite)';
  console.log(`  Source:    ${chalk.dim(source)}`);
  
  if (Object.keys(config).length > 0) {
    console.log(chalk.bold('\nStored Config:'));
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const displayValue = key.toLowerCase().includes('url') || key.toLowerCase().includes('password')
          ? value.substring(0, 40) + '...'
          : value;
        console.log(`  ${key}: ${chalk.dim(displayValue)}`);
      }
    }
  }
  
  console.log('');
}
