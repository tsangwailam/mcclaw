import { getDbUrl, getDbProvider } from './config.js';

let _prisma = null;
let _currentUrl = null;

export async function getPrisma(dbUrl) {
  const url = dbUrl || getDbUrl();
  
  // Return cached client if URL hasn't changed
  if (_prisma && _currentUrl === url) {
    return _prisma;
  }

  // Disconnect old client if URL changed
  if (_prisma) {
    try { await _prisma.$disconnect(); } catch {}
    _prisma = null;
  }

  const provider = getDbProvider(url);
  
  // Set env for Prisma
  process.env.DATABASE_URL = url;

  if (provider === 'postgresql') {
    const { PrismaClient } = await import('../../node_modules/.prisma/client-pg/index.js');
    _prisma = new PrismaClient({ datasourceUrl: url });
  } else {
    const { PrismaClient } = await import('../../node_modules/.prisma/client-sqlite/index.js');
    _prisma = new PrismaClient({ datasourceUrl: url });
  }

  _currentUrl = url;
  return _prisma;
}

/**
 * Create a standalone Prisma client for short-lived CLI operations.
 * Caller is responsible for calling $disconnect().
 */
export async function createPrismaClient(dbUrl) {
  const url = dbUrl || getDbUrl();
  const provider = getDbProvider(url);
  process.env.DATABASE_URL = url;

  if (provider === 'postgresql') {
    const { PrismaClient } = await import('../../node_modules/.prisma/client-pg/index.js');
    return new PrismaClient({ datasourceUrl: url });
  } else {
    const { PrismaClient } = await import('../../node_modules/.prisma/client-sqlite/index.js');
    return new PrismaClient({ datasourceUrl: url });
  }
}

// For API routes (long-lived server) - uses cached singleton
export async function getApiPrisma() {
  const url = process.env.MC_DATABASE_URL || process.env.DATABASE_URL || getDbUrl();
  return getPrisma(url);
}

export default { getPrisma, getApiPrisma, createPrismaClient };
