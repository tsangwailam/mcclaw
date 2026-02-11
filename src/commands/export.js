import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import XLSX from 'xlsx';
import { getDaemonInfo, isDaemonHealthy, getApiUrl, getDbProvider } from '../lib/config.js';
import { createPrismaClient } from '../lib/db.js';
import { toCamelCase } from '../lib/utils.js';

export async function exportCommand(format, options) {
  // Default to CSV if no format specified
  const exportFormat = format || 'csv';
  
  // Validate format
  if (!['csv', 'json', 'xlsx'].includes(exportFormat)) {
    console.error(chalk.red(`Invalid format: ${exportFormat}. Must be one of: csv, json, xlsx`));
    process.exit(1);
  }

  // If --db-url provided, use direct database access
  if (options.dbUrl) {
    return exportDirect(exportFormat, options);
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
    params.append('format', exportFormat);
    if (options.agent && options.agent !== 'all') params.append('agent', options.agent);
    if (options.project && options.project !== 'all') params.append('project', options.project);
    if (options.status && options.status !== 'all') params.append('status', options.status);
    if (options.startDate) params.append('start', options.startDate);
    if (options.endDate) params.append('end', options.endDate);
    if (options.limit) params.append('limit', options.limit);

    const res = await fetch(`${getApiUrl(port)}/api/export?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to export data');
    }

    const contentType = res.headers.get('content-type');
    const filename = options.output || `activities_${new Date().toISOString().split('T')[0]}.${getFileExtension(exportFormat)}`;

    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      await saveFile(filename, JSON.stringify(data, null, 2));
    } else if (exportFormat === 'xlsx') {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(filename, Buffer.from(buffer));
      console.log(chalk.green(`✓ Data exported to ${filename}`));
    } else {
      const text = await res.text();
      await saveFile(filename, text);
    }
  } catch (error) {
    console.error(chalk.red('Error exporting data:'), error.message);
    process.exit(1);
  }
}

async function exportDirect(format, options) {
  try {
    const prisma = await createPrismaClient(options.dbUrl);
    
    const where = {};
    if (options.agent && options.agent !== 'all') where.agent = options.agent;
    if (options.project && options.project !== 'all') where.project = toCamelCase(options.project);
    if (options.status && options.status !== 'all') where.status = options.status;
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = new Date(options.startDate);
      if (options.endDate) {
        const endDate = new Date(options.endDate);
        if (!options.endDate.includes('T')) {
          endDate.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = endDate;
      }
    }

    const limit = options.limit ? parseInt(options.limit) : 10000;

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (activities.length === 0) {
      console.log(chalk.yellow('No activities found matching the filters.'));
      await prisma.$disconnect();
      return;
    }

    const filename = options.output || `activities_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    let content;

    if (format === 'csv') {
      content = generateCSV(activities);
    } else if (format === 'json') {
      content = JSON.stringify(activities, null, 2);
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(activities);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Activities');
      XLSX.writeFile(wb, filename);
      console.log(chalk.green(`✓ Data exported to ${chalk.bold(filename)}`));
      console.log(chalk.dim(`  Format: ${format.toUpperCase()} | Records: ${activities.length}`));
      await prisma.$disconnect();
      return;
    }

    await saveFile(filename, content);
    console.log(chalk.dim(`  Format: ${format.toUpperCase()} | Records: ${activities.length}`));

    await prisma.$disconnect();
  } catch (error) {
    console.error(chalk.red('Error exporting data:'), error.message);
    process.exit(1);
  }
}

function generateCSV(activities) {
  // Flatten the data for CSV
  const csvData = activities.map(activity => ({
    id: activity.id,
    action: activity.action,
    details: activity.details,
    agent: activity.agent,
    project: activity.project,
    status: activity.status,
    duration: activity.duration,
    inputTokens: activity.inputTokens,
    outputTokens: activity.outputTokens,
    totalTokens: activity.totalTokens,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  }));

  return stringify(csvData, { header: true });
}

function getFileExtension(format) {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    case 'xlsx':
      return 'xlsx';
    default:
      return 'txt';
  }
}

async function saveFile(filename, content) {
  try {
    fs.writeFileSync(filename, content, 'utf-8');
    console.log(chalk.green(`✓ Data exported to ${chalk.bold(filename)}`));
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}
