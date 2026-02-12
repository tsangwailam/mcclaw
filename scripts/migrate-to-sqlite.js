import { getPrisma } from '../src/lib/db.js';
import { homedir } from 'os';
import { join } from 'path';

const PG_URL = process.env.PG_DATABASE_URL || 'postgresql://localhost:5432/mission_control';
const SQLITE_URL = process.env.SQLITE_DATABASE_URL || `file:${join(homedir(), '.mc', 'data', 'mission-control.db')}`;

async function migrate() {
  console.log('--- Mission Claw Migration ---');
  
  const pgPrisma = await getPrisma(PG_URL);
  const sqlitePrisma = await getPrisma(SQLITE_URL);
  
  console.log('Fetching activities from PostgreSQL...');
  const activities = await pgPrisma.activity.findMany();
  console.log(`Found ${activities.length} activities.`);

  console.log('Copying to SQLite...');
  let count = 0;
  for (const act of activities) {
    try {
      // Map fields from PG to SQLite
      await sqlitePrisma.activity.create({
        data: {
          action: act.action,
          details: act.details,
          status: act.status || 'completed',
          agent: act.agent,
          project: act.project,
          duration: act.duration,
          inputTokens: act.inputTokens,
          outputTokens: act.outputTokens,
          totalTokens: act.totalTokens,
          createdAt: act.createdAt || act.timestamp, // Fallback to timestamp if createdAt missing
        }
      });
      count++;
    } catch (err) {
      console.error(`Failed to migrate entry: ${act.action}`, err.message);
    }
  }

  console.log(`Migration finished. Copied ${count}/${activities.length} entries.`);
  
  await pgPrisma.$disconnect();
  await sqlitePrisma.$disconnect();
}

migrate().catch(console.error);
