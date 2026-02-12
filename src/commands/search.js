import chalk from 'chalk';
import { getDaemonInfo, isDaemonHealthy, getApiUrl, getDbProvider } from '../lib/config.js';
import { createPrismaClient } from '../lib/db.js';
import { isFuzzyMatch } from '../lib/utils.js';

export async function searchCommand(keyword, options) {
  // If --db-url provided, use direct database access
  if (options.dbUrl) {
    return searchDirect(keyword, options);
  }

  // Otherwise use daemon API
  const { port } = getDaemonInfo();
  
  if (!(await isDaemonHealthy(port))) {
    console.error(chalk.red('Daemon not running. Start it with: mclaw daemon start'));
    console.error(chalk.dim('Or use --db-url for direct database access'));
    process.exit(1);
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('q', keyword);
    if (options.agent) params.append('agent', options.agent);
    if (options.project) params.append('project', options.project);
    if (options.status) params.append('status', options.status);
    if (options.after) params.append('after', options.after);
    if (options.before) params.append('before', options.before);
    if (options.fuzzy) params.append('fuzzy', 'true');
    if (options.limit) params.append('limit', options.limit);

    const res = await fetch(`${getApiUrl(port)}/api/search?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Search failed');
    }

    const data = await res.json();
    displayResults(keyword, data, options);
  } catch (error) {
    console.error(chalk.red('Error searching:'), error.message);
    process.exit(1);
  }
}

async function searchDirect(keyword, options) {
  try {
    const prisma = await createPrismaClient(options.dbUrl);
    
    const where = {};

    // Date filters
    if (options.after || options.before) {
      where.createdAt = {};
      if (options.after) where.createdAt.gte = new Date(options.after);
      if (options.before) {
        const endDate = new Date(options.before);
        if (!options.before.includes('T')) {
          endDate.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = endDate;
      }
    }

    // Exact filters
    if (options.agent) where.agent = options.agent;
    if (options.project) where.project = options.project;
    if (options.status) where.status = options.status;

    const limit = options.limit ? parseInt(options.limit) : 50;

    let results = [];
    if (keyword) {
      const activities = await prisma.activity.findMany({
        where,
        take: limit * 2,
      });

      const lowerQuery = keyword.toLowerCase();
      results = activities.filter(activity => {
        const action = (activity.action || '').toLowerCase();
        const details = (activity.details || '').toLowerCase();
        
        if (options.fuzzy) {
          return isFuzzyMatch(action, lowerQuery) || isFuzzyMatch(details, lowerQuery);
        } else {
          return action.includes(lowerQuery) || details.includes(lowerQuery);
        }
      });
    } else {
      results = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    results = results.slice(0, limit);

    displayResults(keyword, { query: keyword, results, total: results.length }, options);
    await prisma.$disconnect();
  } catch (error) {
    console.error(chalk.red('Error searching:'), error.message);
    process.exit(1);
  }
}

function displayResults(keyword, data, options) {
  console.log(chalk.cyan(`\n🔍 Search Results for "${keyword}"`) + (data.total > 0 ? ` (${data.total} found)` : ' (0 found)'));
  
  // Show applied filters
  if (options.agent || options.project || options.status || options.after || options.before) {
    const filters = [];
    if (options.agent) filters.push(`agent:${options.agent}`);
    if (options.project) filters.push(`project:${options.project}`);
    if (options.status) filters.push(`status:${options.status}`);
    if (options.after) filters.push(`after:${options.after}`);
    if (options.before) filters.push(`before:${options.before}`);
    console.log(chalk.gray(`Filters: ${filters.join(', ')}`));
  }

  if (data.results.length === 0) {
    console.log(chalk.yellow('No results found.\n'));
    return;
  }

  console.log();
  data.results.forEach((result, index) => {
    const number = chalk.dim(`${index + 1}.`);
    const action = chalk.bold(result.action);
    const status = getStatusColor(result.status)(result.status);
    const agent = result.agent ? chalk.dim(`[${result.agent}]`) : '';
    const time = chalk.gray(new Date(result.createdAt).toLocaleString());

    console.log(`${number} ${action} ${status} ${agent}`);
    
    if (result.details && result.details !== result.action) {
      const preview = result.details.substring(0, 80).replace(/\n/g, ' ');
      console.log(`   ${chalk.dim(preview)}${result.details.length > 80 ? '...' : ''}`);
    }

    if (result.project) {
      console.log(`   ${chalk.dim(`📁 ${result.project}`)}`);
    }

    console.log(`   ${time}`);
    console.log();
  });

  console.log(chalk.dim(`Total: ${data.results.length} results`));
}

function getStatusColor(status) {
  switch (status) {
    case 'completed':
      return chalk.green;
    case 'failed':
      return chalk.red;
    case 'in_progress':
      return chalk.yellow;
    default:
      return chalk.gray;
  }
}

