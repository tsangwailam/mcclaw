'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const styles = {
  container: {
    maxWidth: '1200px',
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
  subtitle: {
    color: '#8b949e',
    fontSize: '14px',
  },
  leaderboard: {
    background: '#161b22',
    borderRadius: '8px',
    border: '1px solid #30363d',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '16px',
    borderBottom: '1px solid #30363d',
    background: '#21262d',
    color: '#8b949e',
    fontSize: '12px',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #30363d',
  },
  rankBadge: (rank) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontWeight: 'bold',
    fontSize: '14px',
    background: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#30363d',
    color: rank <= 3 ? '#0d1117' : '#c9d1d9',
  }),
  agentLink: {
    textDecoration: 'none',
    color: '#58a6ff',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  agentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#c9d1d9',
  },
  metric: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#3fb950',
  },
  metricSecondary: {
    fontSize: '14px',
    color: '#8b949e',
    marginTop: '4px',
  },
  alertBad: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    background: '#da3633',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
  },
  alertWarning: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    background: '#d29922',
    color: '#000',
    fontSize: '12px',
    fontWeight: '600',
  },
  alertGood: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    background: '#3fb950',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
  },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/analytics/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents || []);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const getSuccessRateColor = (rate) => {
    if (rate >= 90) return '#3fb950';
    if (rate >= 70) return '#d29922';
    return '#da3633';
  };

  const getAlertComponent = (successRate) => {
    if (successRate < 70) {
      return <span style={styles.alertBad}>Low Success Rate</span>;
    }
    if (successRate < 85) {
      return <span style={styles.alertWarning}>Medium Success Rate</span>;
    }
    return <span style={styles.alertGood}>Good Performance</span>;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading agents...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Agent Leaderboard</h1>
        <p style={styles.subtitle}>
          Top performing agents ranked by success rate and activity volume
        </p>
      </div>

      {agents.length === 0 ? (
        <p style={{ color: '#8b949e', padding: '40px', textAlign: 'center' }}>
          No agents found. Use <code>mclaw log "action" --agent X</code> to log agent activities.
        </p>
      ) : (
        <div style={styles.leaderboard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Agent</th>
                <th style={styles.th}>Success Rate</th>
                <th style={styles.th}>Total Activities</th>
                <th style={styles.th}>Failures</th>
                <th style={styles.th}>Avg Tokens/Task</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent.agent}>
                  <td style={styles.td}>
                    <div style={styles.rankBadge(index + 1)}>{index + 1}</div>
                  </td>
                  <td style={styles.td}>
                    <Link
                      href={`/agents/${encodeURIComponent(agent.agent)}`}
                      style={styles.agentLink}
                    >
                      <div style={styles.agentName}>{agent.agent}</div>
                    </Link>
                  </td>
                  <td style={styles.td}>
                    <div style={{ ...styles.metric, color: getSuccessRateColor(agent.successRate) }}>
                      {agent.successRate}%
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.metric}>{agent.totalActivities}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ color: agent.failureCount > 0 ? '#da3633' : '#3fb950', fontWeight: '600' }}>
                      {agent.failureCount}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.metric}>{agent.avgTokensPerTask}</div>
                    <div style={styles.metricSecondary}>tokens</div>
                  </td>
                  <td style={styles.td}>
                    {getAlertComponent(agent.successRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d' }}>
        <h3 style={{ marginTop: 0, color: '#c9d1d9' }}>Legend</h3>
        <ul style={{ color: '#8b949e', marginBottom: 0 }}>
          <li><strong style={{ color: '#3fb950' }}>Success Rate:</strong> Percentage of completed tasks vs total tasks</li>
          <li><strong style={{ color: '#3fb950' }}>Total Activities:</strong> Total number of logged activities</li>
          <li><strong style={{ color: '#3fb950' }}>Avg Tokens/Task:</strong> Average tokens used per task</li>
          <li><strong style={{ color: '#da3633' }}>Low Success Rate:</strong> Less than 70% success rate (needs attention)</li>
        </ul>
      </div>
    </div>
  );
}
