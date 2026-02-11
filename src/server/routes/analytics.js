import { getApiPrisma } from '../../lib/db.js';

export async function handleGetAgentAnalytics(req, res, url, agentName) {
  try {
    const prisma = await getApiPrisma();

    // Get all activities for this agent
    const activities = await prisma.activity.findMany({
      where: { agent: agentName },
      orderBy: { createdAt: 'asc' },
    });

    if (activities.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        agent: agentName,
        totalActivities: 0,
        successRate: 0,
        failureRate: 0,
        inProgressRate: 0,
        avgDuration: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgTotalTokens: 0,
        topProjects: [],
        activityTrend: [],
        recentActivities: [],
      }));
      return;
    }

    // Calculate metrics
    const completed = activities.filter(a => a.status === 'completed').length;
    const failed = activities.filter(a => a.status === 'failed').length;
    const inProgress = activities.filter(a => a.status === 'in_progress').length;
    const total = activities.length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    const inProgressRate = total > 0 ? (inProgress / total) * 100 : 0;

    // Calculate average duration (only count completed tasks)
    const completedActivities = activities.filter(a => a.status === 'completed' && a.duration);
    const avgDuration = completedActivities.length > 0
      ? completedActivities.reduce((sum, a) => {
          // Parse duration if it's a string
          if (typeof a.duration === 'string') {
            const match = a.duration.match(/(\d+)/);
            return sum + (match ? parseInt(match[1]) : 0);
          }
          return sum + (a.duration || 0);
        }, 0) / completedActivities.length
      : 0;

    // Calculate token statistics
    const activitiesWithTokens = activities.filter(a => a.totalTokens);
    const avgTotalTokens = activitiesWithTokens.length > 0
      ? activitiesWithTokens.reduce((sum, a) => sum + (a.totalTokens || 0), 0) / activitiesWithTokens.length
      : 0;
    const avgInputTokens = activitiesWithTokens.length > 0
      ? activitiesWithTokens.reduce((sum, a) => sum + (a.inputTokens || 0), 0) / activitiesWithTokens.length
      : 0;
    const avgOutputTokens = activitiesWithTokens.length > 0
      ? activitiesWithTokens.reduce((sum, a) => sum + (a.outputTokens || 0), 0) / activitiesWithTokens.length
      : 0;

    // Get top projects
    const projectCounts = {};
    activities.forEach(a => {
      if (a.project) {
        projectCounts[a.project] = (projectCounts[a.project] || 0) + 1;
      }
    });
    const topProjects = Object.entries(projectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([project, count]) => ({ project, count }));

    // Build activity trend (by day)
    const trendMap = {};
    activities.forEach(a => {
      const date = new Date(a.createdAt).toISOString().split('T')[0];
      if (!trendMap[date]) {
        trendMap[date] = { date, completed: 0, failed: 0, inProgress: 0 };
      }
      if (a.status === 'completed') trendMap[date].completed++;
      else if (a.status === 'failed') trendMap[date].failed++;
      else if (a.status === 'in_progress') trendMap[date].inProgress++;
    });
    const activityTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Get recent activities
    const recentActivities = activities.slice(-10).reverse();

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      agent: agentName,
      totalActivities: total,
      successRate: Math.round(successRate * 10) / 10,
      failureRate: Math.round(failureRate * 10) / 10,
      inProgressRate: Math.round(inProgressRate * 10) / 10,
      avgDuration: Math.round(avgDuration * 10) / 10,
      avgInputTokens: Math.round(avgInputTokens),
      avgOutputTokens: Math.round(avgOutputTokens),
      avgTotalTokens: Math.round(avgTotalTokens),
      topProjects,
      activityTrend,
      recentActivities,
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

export async function handleGetAllAgentsAnalytics(req, res) {
  try {
    const prisma = await getApiPrisma();

    // Get unique agents
    const agentData = await prisma.activity.groupBy({
      by: ['agent'],
      _count: true,
      orderBy: { _count: { agent: 'desc' } },
    });

    const agents = agentData.filter(a => a.agent).map(a => a.agent);

    // Calculate metrics for each agent
    const analyticsPromises = agents.map(async (agent) => {
      const activities = await prisma.activity.findMany({
        where: { agent },
      });

      const completed = activities.filter(a => a.status === 'completed').length;
      const failed = activities.filter(a => a.status === 'failed').length;
      const total = activities.length;

      const successRate = total > 0 ? (completed / total) * 100 : 0;
      const avgTotalTokens = activities.filter(a => a.totalTokens).length > 0
        ? activities.reduce((sum, a) => sum + (a.totalTokens || 0), 0) / activities.filter(a => a.totalTokens).length
        : 0;

      return {
        agent,
        totalActivities: total,
        successRate: Math.round(successRate * 10) / 10,
        failureCount: failed,
        avgTokensPerTask: Math.round(avgTotalTokens),
      };
    });

    const agentAnalytics = await Promise.all(analyticsPromises);

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      agents: agentAnalytics.sort((a, b) => b.successRate - a.successRate),
      total: agentAnalytics.length,
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
