import http from 'http';
import { stringify } from 'csv-stringify/sync';
import XLSX from 'xlsx';
import { getApiPrisma } from '../lib/db.js';
import { toCamelCase } from '../lib/utils.js';
import { createWebSocketServer, broadcastActivity } from '../lib/websocket.js';

const PORT = process.env.PORT || 3001;

async function handleGetActivity(req, res, url) {
  try {
  const prisma = await getApiPrisma();
  const searchParams = url.searchParams;
  const agent = searchParams.get('agent');
  const project = searchParams.get('project');
  const status = searchParams.get('status');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const limit = parseInt(searchParams.get('limit') || '100');

  const where = {};
  if (agent && agent !== 'all') where.agent = agent;
  if (project && project !== 'all') where.project = project;
  if (status && status !== 'all') where.status = status;
  
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = new Date(start);
    if (end) {
      const endDate = new Date(end);
      if (!end.includes('T')) {
        endDate.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = endDate;
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const [agents, projects, statuses] = await Promise.all([
    prisma.activity.findMany({ select: { agent: true }, distinct: ['agent'], where: { agent: { not: null } } }),
    prisma.activity.findMany({ select: { project: true }, distinct: ['project'], where: { project: { not: null } } }),
    prisma.activity.findMany({ select: { status: true }, distinct: ['status'] }),
  ]);

  const total = await prisma.activity.count({ where });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.activity.count({
    where: { ...where, createdAt: { ...where.createdAt, gte: today } }
  });

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekCount = await prisma.activity.count({
    where: { ...where, createdAt: { ...where.createdAt, gte: lastWeek } }
  });

  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({
    activities,
    stats: { total, today: todayCount, week: weekCount },
    filters: {
      agents: agents.map(a => a.agent).filter(Boolean),
      projects: projects.map(p => p.project).filter(Boolean),
      statuses: statuses.map(s => s.status).filter(Boolean),
    }
  }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function handleGetStats(req, res) {
  try {
  const prisma = await getApiPrisma();
  
  const total = await prisma.activity.count();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.activity.count({
    where: { createdAt: { gte: today } }
  });

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekCount = await prisma.activity.count({
    where: { createdAt: { gte: lastWeek } }
  });

  const byStatus = await prisma.activity.groupBy({
    by: ['status'],
    _count: true,
  });

  const byAgent = await prisma.activity.groupBy({
    by: ['agent'],
    _count: true,
    orderBy: { _count: { agent: 'desc' } },
    take: 5,
  });

  const byProject = await prisma.activity.groupBy({
    by: ['project'],
    _count: true,
    orderBy: { _count: { project: 'desc' } },
    take: 5,
  });

  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({
    total,
    today: todayCount,
    week: weekCount,
    byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
    byAgent: byAgent.filter(a => a.agent).map(a => ({ agent: a.agent, count: a._count })),
    byProject: byProject.filter(p => p.project).map(p => ({ project: p.project, count: p._count })),
  }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function handleExport(req, res, url) {
  try {
    const prisma = await getApiPrisma();
    const searchParams = url.searchParams;
    const format = searchParams.get('format') || 'csv';
    const agent = searchParams.get('agent');
    const project = searchParams.get('project');
    const status = searchParams.get('status');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '10000');

    // Validate format
    if (!['csv', 'json', 'xlsx'].includes(format)) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Invalid format. Must be csv, json, or xlsx' }));
      return;
    }

    const where = {};
    if (agent && agent !== 'all') where.agent = agent;
    if (project && project !== 'all') where.project = project;
    if (status && status !== 'all') where.status = status;
    
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        if (!end.includes('T')) {
          endDate.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = endDate;
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    let content;
    let contentType;
    let filename;

    if (format === 'csv') {
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
      content = stringify(csvData, { header: true });
      contentType = 'text/csv';
      filename = `activities_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (format === 'json') {
      content = JSON.stringify(activities, null, 2);
      contentType = 'application/json';
      filename = `activities_${new Date().toISOString().split('T')[0]}.json`;
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(activities);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Activities');
      content = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `activities_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function handlePostActivity(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      
      if (!data.action || typeof data.action !== 'string' || data.action.trim().length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Missing or invalid "action" field' }));
        return;
      }
      
      const validStatuses = ['completed', 'in_progress', 'failed'];
      if (data.status && !validStatuses.includes(data.status)) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }));
        return;
      }
      
      const prisma = await getApiPrisma();
      
      const action = data.action.trim();
      const agent = data.agent || null;
      const project = toCamelCase(data.project) || null;
      const status = data.status;

      if (status && status !== 'in_progress') {
        const existingInProgress = await prisma.activity.findFirst({
          where: { action, agent: agent || null, project: project || null, status: 'in_progress' },
          orderBy: { createdAt: 'desc' },
        });

        if (existingInProgress) {
          const updated = await prisma.activity.update({
            where: { id: existingInProgress.id },
            data: {
              status,
              details: data.details !== data.action ? data.details : existingInProgress.details,
              duration: data.duration || existingInProgress.duration,
              inputTokens: data.inputTokens || existingInProgress.inputTokens,
              outputTokens: data.outputTokens || existingInProgress.outputTokens,
              totalTokens: data.totalTokens || existingInProgress.totalTokens,
            },
          });
          broadcastActivity(updated);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(updated));
          return;
        }
      }

      const activity = await prisma.activity.create({
        data: {
          action: data.action,
          details: data.details || data.action,
          agent: agent,
          project: project,
          status: data.status || 'completed',
          duration: data.duration || null,
          inputTokens: data.inputTokens || null,
          outputTokens: data.outputTokens || null,
          totalTokens: data.totalTokens || null,
        },
      });

      broadcastActivity(activity);
      res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(activity));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.pathname === '/api/activity' && req.method === 'GET') {
    return handleGetActivity(req, res, url);
  }

  if (url.pathname === '/api/activity' && req.method === 'POST') {
    return handlePostActivity(req, res);
  }

  if (url.pathname === '/api/activity/stats' && req.method === 'GET') {
    return handleGetStats(req, res);
  }

  if (url.pathname === '/api/export' && req.method === 'GET') {
    return handleExport(req, res, url);
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Mission Claw Headless API running on port ${PORT}`);
  createWebSocketServer(server, PORT);
});
