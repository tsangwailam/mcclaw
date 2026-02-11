'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

function formatNumber(n) {
  return n?.toLocaleString() ?? '—';
}

const colors = {
  completed: '#238636',
  failed: '#da3633',
  in_progress: '#9e6a03',
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '24px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '24px', borderBottom: '1px solid #30363d', paddingBottom: '16px',
  },
  title: { fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: {
    padding: '6px 14px', fontSize: '13px', fontWeight: '600', borderRadius: '6px',
    border: '1px solid #30363d', background: 'transparent', color: '#c9d1d9',
    cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
  },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#161b22', borderRadius: '8px', padding: '16px', border: '1px solid #30363d' },
  statLabel: { fontSize: '12px', color: '#8b949e', textTransform: 'uppercase' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#58a6ff' },
  statValueSmall: { fontSize: '14px', color: '#c9d1d9', marginTop: '4px' },
  chartContainer: {
    background: '#161b22', borderRadius: '8px', padding: '20px', border: '1px solid #30363d', marginBottom: '24px',
  },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#c9d1d9' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#c9d1d9' },
  table: {
    width: '100%', borderCollapse: 'collapse', background: '#161b22',
    borderRadius: '8px', overflow: 'hidden', border: '1px solid #30363d',
  },
  th: {
    textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #30363d',
    background: '#21262d', color: '#8b949e', fontSize: '12px', textTransform: 'uppercase',
    cursor: 'pointer', userSelect: 'none',
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #30363d' },
  status: (status) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '500', color: '#fff',
    background: status === 'completed' ? '#238636' : status === 'failed' ? '#da3633' : '#9e6a03',
  }),
  badge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    fontSize: '12px', background: '#30363d', color: '#c9d1d9',
  },
  filterBar: {
    display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap',
  },
  select: {
    background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d',
    borderRadius: '6px', padding: '6px 12px', fontSize: '14px', outline: 'none',
  },
  agentList: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  agentBadge: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
    borderRadius: '6px', background: '#21262d', border: '1px solid #30363d', fontSize: '13px',
  },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
      <p style={{ color: '#c9d1d9', margin: '0 0 6px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectName = decodeURIComponent(params.projectName);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProjectData();
  }, [projectName]);

  async function fetchProjectData() {
    try {
      const res = await fetch(`/api/activity?project=${encodeURIComponent(projectName)}&limit=500`);
      const json = await res.json();
      const activities = json.activities || [];
      setData(computeProjectData(activities));
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    } finally {
      setLoading(false);
    }
  }

  function computeProjectData(activities) {
    const total = activities.length;
    const completed = activities.filter(a => a.status === 'completed').length;
    const failed = activities.filter(a => a.status === 'failed').length;
    const inProgress = activities.filter(a => a.status === 'in_progress').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total tokens
    const totalTokens = activities.reduce((sum, a) => sum + (a.totalTokens || 0), 0);
    const totalInput = activities.reduce((sum, a) => sum + (a.inputTokens || 0), 0);
    const totalOutput = activities.reduce((sum, a) => sum + (a.outputTokens || 0), 0);

    // Average duration (parse "Xm Ys" or similar)
    const durations = activities.filter(a => a.duration).map(a => {
      const m = a.duration.match(/(\d+)/);
      return m ? parseInt(m[1]) : 0;
    }).filter(d => d > 0);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;

    // Top agents
    const agentMap = {};
    activities.forEach(a => {
      if (a.agent) {
        agentMap[a.agent] = (agentMap[a.agent] || 0) + 1;
      }
    });
    const topAgents = Object.entries(agentMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, count]) => ({ agent, count }));

    // Daily token chart data (last 30 days)
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const dailyMap = {};
    days.forEach(day => {
      dailyMap[day] = { date: day, completed: 0, failed: 0, in_progress: 0, total: 0 };
    });

    activities.forEach(a => {
      const day = new Date(a.createdAt).toISOString().slice(0, 10);
      if (dailyMap[day]) {
        const tokens = a.totalTokens || 0;
        dailyMap[day][a.status] = (dailyMap[day][a.status] || 0) + tokens;
        dailyMap[day].total += tokens;
      }
    });

    const dailyChart = days.map(d => ({
      ...dailyMap[d],
      date: d.slice(5), // MM-DD for chart labels
    }));

    // Creation date (earliest activity)
    const creationDate = activities.length > 0
      ? activities[activities.length - 1].createdAt
      : null;

    return {
      total, completed, failed, inProgress, completionRate,
      totalTokens, totalInput, totalOutput, avgDuration,
      topAgents, dailyChart, activities, creationDate,
    };
  }

  const sortedActivities = () => {
    if (!data) return [];
    let items = [...data.activities];
    if (statusFilter !== 'all') {
      items = items.filter(a => a.status === statusFilter);
    }
    items.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'createdAt') {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (loading) {
    return <div style={styles.container}><p>Loading project details...</p></div>;
  }

  if (!data || data.total === 0) {
    return (
      <div style={styles.container}>
        <button onClick={() => router.push('/')} style={styles.backBtn}>← Back</button>
        <p style={{ marginTop: '24px', color: '#8b949e' }}>No activities found for project "{projectName}".</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <button onClick={() => router.push('/')} style={{ ...styles.backBtn, marginBottom: '12px' }}>← Dashboard</button>
          <h1 style={styles.title}>
            <span style={{ fontSize: '28px' }}>📁</span>
            <span>{projectName}</span>
          </h1>
          {data.creationDate && (
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '4px 0 0' }}>
              First activity: {new Date(data.creationDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={() => { setLoading(true); fetchProjectData().finally(() => setLoading(false)); }}
          style={{
            padding: '6px 14px', fontSize: '13px', fontWeight: '600', borderRadius: '6px',
            border: '1px solid #f0883e', background: 'transparent', color: '#f0883e', cursor: 'pointer',
          }}
        >↻ Refresh</button>
      </header>

      {/* Metrics */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Tasks</div>
          <div style={styles.statValue}>{data.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completed</div>
          <div style={{ ...styles.statValue, color: '#238636' }}>{data.completed}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Failed</div>
          <div style={{ ...styles.statValue, color: '#da3633' }}>{data.failed}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completion Rate</div>
          <div style={styles.statValue}>{data.completionRate}%</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Tokens</div>
          <div style={styles.statValue}>{formatNumber(data.totalTokens)}</div>
          <div style={styles.statValueSmall}>
            {formatNumber(data.totalInput)} in / {formatNumber(data.totalOutput)} out
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>In Progress</div>
          <div style={{ ...styles.statValue, color: '#9e6a03' }}>{data.inProgress}</div>
        </div>
      </div>

      {/* Top Agents */}
      {data.topAgents.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={styles.sectionTitle}>Top Agents</h3>
          <div style={styles.agentList}>
            {data.topAgents.map(a => (
              <div key={a.agent} style={styles.agentBadge}>
                <span style={{ color: '#58a6ff' }}>🤖 {a.agent}</span>
                <span style={{ color: '#8b949e' }}>({a.count} tasks)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Token Usage Chart */}
      <div style={styles.chartContainer}>
        <h3 style={styles.chartTitle}>Daily Token Usage (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.dailyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="date" stroke="#8b949e" fontSize={11} />
            <YAxis stroke="#8b949e" fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill={colors.completed} name="Completed" />
            <Bar dataKey="failed" stackId="a" fill={colors.failed} name="Failed" />
            <Bar dataKey="in_progress" stackId="a" fill={colors.in_progress} name="In Progress" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activities Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={styles.sectionTitle}>Recent Activities</h3>
          <div style={styles.filterBar}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.select}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} onClick={() => toggleSort('action')}>Action{sortIndicator('action')}</th>
              <th style={styles.th} onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
              <th style={styles.th} onClick={() => toggleSort('agent')}>Agent{sortIndicator('agent')}</th>
              <th style={styles.th} onClick={() => toggleSort('duration')}>Duration{sortIndicator('duration')}</th>
              <th style={styles.th} onClick={() => toggleSort('totalTokens')}>Tokens{sortIndicator('totalTokens')}</th>
              <th style={styles.th} onClick={() => toggleSort('createdAt')}>Time{sortIndicator('createdAt')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedActivities().map(act => (
              <tr key={act.id}>
                <td style={styles.td}>
                  <strong>{act.action}</strong>
                  {act.details && act.details !== act.action && (
                    <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>
                      {act.details.substring(0, 120)}
                    </div>
                  )}
                </td>
                <td style={styles.td}><span style={styles.status(act.status)}>{act.status}</span></td>
                <td style={styles.td}>{act.agent ? <span style={styles.badge}>{act.agent}</span> : '—'}</td>
                <td style={styles.td}>{act.duration || '—'}</td>
                <td style={styles.td}>{act.totalTokens ? formatNumber(act.totalTokens) : '—'}</td>
                <td style={{ ...styles.td, color: '#8b949e', fontSize: '12px' }}>
                  {new Date(act.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedActivities().length === 0 && (
          <p style={{ textAlign: 'center', color: '#8b949e', padding: '40px' }}>No activities match the current filter.</p>
        )}
      </div>
    </div>
  );
}
