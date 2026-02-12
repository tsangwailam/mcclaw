import { getApiPrisma } from '../../lib/db.js';
import { isFuzzyMatch } from '../../lib/utils.js';

export async function handleSearch(req, res, url) {
  try {
    const prisma = await getApiPrisma();
    const searchParams = url.searchParams;
    const query = searchParams.get('q');
    const agent = searchParams.get('agent');
    const project = searchParams.get('project');
    const status = searchParams.get('status');
    const after = searchParams.get('after');
    const before = searchParams.get('before');
    const fuzzy = searchParams.get('fuzzy') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter conditions
    const where = {};

    // Date range filter
    if (after || before) {
      where.createdAt = {};
      if (after) where.createdAt.gte = new Date(after);
      if (before) {
        const endDate = new Date(before);
        if (!before.includes('T')) {
          endDate.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = endDate;
      }
    }

    // Exact filters
    if (agent) where.agent = agent;
    if (project) where.project = project;
    if (status) where.status = status;

    // Full-text search in action and details
    let searchResults = [];
    if (query) {
      // Get all activities matching the where clause
      const activities = await prisma.activity.findMany({
        where,
        take: limit * 2, // Get more to account for search filtering
      });

      // Filter by search query
      const lowerQuery = query.toLowerCase();
      searchResults = activities.filter(activity => {
        const action = (activity.action || '').toLowerCase();
        const details = (activity.details || '').toLowerCase();
        
        if (fuzzy) {
          // Fuzzy matching: check if all characters are found in order
          return isFuzzyMatch(action, lowerQuery) || isFuzzyMatch(details, lowerQuery);
        } else {
          // Exact substring matching
          return action.includes(lowerQuery) || details.includes(lowerQuery);
        }
      });
    } else {
      searchResults = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    // Sort by relevance/date
    searchResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    searchResults = searchResults.slice(0, limit);

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      query,
      results: searchResults,
      total: searchResults.length,
      filters: { agent, project, status, after, before },
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

export async function handleSearchAutocomplete(req, res, url) {
  try {
    const prisma = await getApiPrisma();
    const searchParams = url.searchParams;
    const type = searchParams.get('type'); // 'agents', 'projects', 'actions'
    const prefix = searchParams.get('prefix') || '';

    let results = [];

    if (type === 'agents') {
      const agents = await prisma.activity.findMany({
        where: { agent: { not: null } },
        select: { agent: true },
        distinct: ['agent'],
        take: 10,
      });
      results = agents
        .map(a => a.agent)
        .filter(a => a && a.toLowerCase().includes(prefix.toLowerCase()));
    } else if (type === 'projects') {
      const projects = await prisma.activity.findMany({
        where: { project: { not: null } },
        select: { project: true },
        distinct: ['project'],
        take: 10,
      });
      results = projects
        .map(p => p.project)
        .filter(p => p && p.toLowerCase().includes(prefix.toLowerCase()));
    } else if (type === 'actions') {
      const actions = await prisma.activity.findMany({
        where: { action: { not: null } },
        select: { action: true },
        distinct: ['action'],
        take: 10,
      });
      results = actions
        .map(a => a.action)
        .filter(a => a && a.toLowerCase().includes(prefix.toLowerCase()));
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ type, prefix, results: results.slice(0, 10) }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

