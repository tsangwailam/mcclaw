'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '32px',
    borderBottom: '1px solid #30363d',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  breadcrumb: {
    color: '#8b949e',
    fontSize: '13px',
    marginBottom: '8px',
  },
  breadcrumbLink: {
    color: '#58a6ff',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  metricCard: {
    background: '#161b22',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #30363d',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#8b949e',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  metricSubtext: {
    fontSize: '12px',
    color: '#8b949e',
    marginTop: '8px',
  },
  chartContainer: {
    background: '#161b22',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #30363d',
    marginBottom: '24px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: '16px',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#161b22',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #30363d',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #30363d',
    background: '#21262d',
    color: '#8b949e',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #30363d',
  },
};

const COLORS = ['#3fb950', '#f0883e', '#da3633'];

export default function AgentAnalyticsPage() {
  const params = useParams();
  const agentName = decodeURIComponent(params.agentName);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/analytics/agents/${encodeURIComponent(agentName)}`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          setError('Failed to load agent analytics');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Error loading analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [agentName]);

  if (loading) {
    return <div style={styles.container}><p>Loading agent analytics...</p></div>;
  }

  if (error || !analytics) {
    return <div style={styles.container}><p style={{ color: '#da3633' }}>{error || 'No data available'}</p></div>;
  }

  const statusData = [
    { name: 'Completed', value: Math.round((analytics.successRate / 100) * analytics.totalActivities), fill: '#3fb950' },
    { name: 'Failed', value: Math.round((analytics.failureRate / 100) * analytics.totalActivities), fill: '#da3633' },
    { name: 'In Progress', value: Math.round((analytics.inProgressRate / 100) * analytics.totalActivities), fill: '#f0883e' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.breadcrumb}>
          <Link href="/agents" style={styles.breadcrumbLink}>← Back to Leaderboard</Link>
        </div>
        <h1 style={styles.title}>📈 {agentName}</h1>
        <p style={{ color: '#8b949e' }}>Detailed performance analytics and activity trends</p>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Success Rate</div>
          <div style={{ ...styles.metricValue, color: analytics.successRate >= 90 ? '#3fb950' : analytics.successRate >= 70 ? '#f0883e' : '#da3633' }}>
            {analytics.successRate}%
          </div>
          <div style={styles.metricSubtext}>{Math.round((analytics.successRate / 100) * analytics.totalActivities)} out of {analytics.totalActivities}</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Activities</div>
          <div style={styles.metricValue}>{analytics.totalActivities}</div>
          <div style={styles.metricSubtext}>
            {Math.round((analytics.successRate / 100) * analytics.totalActivities)} completed, {Math.round((analytics.failureRate / 100) * analytics.totalActivities)} failed
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Avg Duration</div>
          <div style={styles.metricValue}>{analytics.avgDuration.toFixed(1)}</div>
          <div style={styles.metricSubtext}>seconds per task</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Avg Tokens/Task</div>
          <div style={styles.metricValue}>{analytics.avgTotalTokens.toFixed(0)}</div>
          <div style={styles.metricSubtext}>
            {analytics.avgInputTokens.toFixed(0)} in / {analytics.avgOutputTokens.toFixed(0)} out
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Failure Rate</div>
          <div style={{ ...styles.metricValue, color: analytics.failureRate > 0 ? '#da3633' : '#3fb950' }}>
            {analytics.failureRate}%
          </div>
          <div style={styles.metricSubtext}>{Math.round((analytics.failureRate / 100) * analytics.totalActivities)} failures</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>In Progress</div>
          <div style={styles.metricValue}>{analytics.inProgressRate}%</div>
          <div style={styles.metricSubtext}>{Math.round((analytics.inProgressRate / 100) * analytics.totalActivities)} tasks</div>
        </div>
      </div>

      <div style={styles.twoColGrid}>
        <div style={styles.chartContainer}>
          <div style={styles.chartTitle}>Activity Status Distribution</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartContainer}>
          <div style={styles.chartTitle}>Activity Trend (by Day)</div>
          {analytics.activityTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#3fb950" name="Completed" />
                <Bar dataKey="failed" stackId="a" fill="#da3633" name="Failed" />
                <Bar dataKey="inProgress" stackId="a" fill="#f0883e" name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#8b949e' }}>No trend data available</p>
          )}
        </div>
      </div>

      {analytics.topProjects.length > 0 && (
        <div style={styles.chartContainer}>
          <div style={styles.chartTitle}>Top Projects</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Activities</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProjects.map((proj, i) => (
                <tr key={i}>
                  <td style={styles.td}>{proj.project}</td>
                  <td style={styles.td}>{proj.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {analytics.recentActivities.length > 0 && (
        <div style={styles.chartContainer}>
          <div style={styles.chartTitle}>Recent Activities</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentActivities.map((act) => (
                <tr key={act.id}>
                  <td style={styles.td}>{act.action}</td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: act.status === 'completed' ? '#238636' : act.status === 'failed' ? '#da3633' : '#9e6a03',
                      color: '#fff',
                      fontWeight: '500',
                    }}>
                      {act.status}
                    </span>
                  </td>
                  <td style={styles.td}>{act.project || '—'}</td>
                  <td style={{ ...styles.td, color: '#8b949e', fontSize: '12px' }}>
                    {new Date(act.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
