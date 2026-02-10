import { getDbUrl, getDbProvider } from './config.js';

let _prisma = null;
let _currentUrl = null;

export async function getPrisma(dbUrl) {
  const url = dbUrl || getDbUrl();
  
  // Return cached client if URL hasn't changed
  if (_prisma && _currentUrl === url) {
    return _prisma;
  }

  const provider = getDbProvider(url);
  
  // Set env for Prisma
  process.env.DATABASE_URL = url;

  if (provider === 'postgresql') {
    // Dynamic import for PostgreSQL client
    const { PrismaClient } = await import('../../node_modules/.prisma/client-pg/index.js');
    _prisma = new PrismaClient({ datasourceUrl: url });
  } else {
    // Dynamic import for SQLite client
    const { PrismaClient } = await import('../../node_modules/.prisma/client-sqlite/index.js');
    _prisma = new PrismaClient({ datasourceUrl: url });
  }

  _currentUrl = url;
  return _prisma;
}

// For API routes (dashboard) - uses env var
export async function getApiPrisma() {
  const url = process.env.MC_DATABASE_URL || process.env.DATABASE_URL || getDbUrl();
  return getPrisma(url);
}

export default { getPrisma, getApiPrisma };
