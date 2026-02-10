'use client';

import { useEffect, useState } from 'react';

function formatNumber(n) {
  return n?.toLocaleString() ?? '—';
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #30363d',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#161b22',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #30363d',
  },
  statLabel: {
    fontSize: '12px',
    color: '#8b949e',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#58a6ff',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    background: '#161b22',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #30363d',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#8b949e',
    fontWeight: '500',
  },
  select: {
    background: '#0d1117',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  input: {
    background: '#0d1117',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    outline: 'none',
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
  status: (status) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    background: status === 'completed' ? '#238636' : 
                status === 'failed' ? '#da3633' : '#9e6a03',
    color: '#fff',
  }),
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    background: '#30363d',
    color: '#c9d1d9',
  },
  tokenBreakdown: {
    fontSize: '11px',
    color: '#8b949e',
    marginTop: '2px',
  },
};

export default function Dashboard() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [filterOptions, setFilterOptions] = useState({ agents: [], projects: [], statuses: [] });
  
  // Default to last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultStart = yesterday.toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    agent: 'all',
    project: 'all',
    status: 'all',
    start: defaultStart,
    end: defaultEnd,
  });
  const [activeQuickFilter, setActiveQuickFilter] = useState('24h');
  const [loading, setLoading] = useState(true);

  const quickFilterOptions = [
    { label: '10m', minutes: 10 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h', minutes: 120 },
    { label: '24h', minutes: 1440 },
  ];

  const applyQuickFilter = (minutes, label) => {
    const now = new Date();
    const start = new Date(now.getTime() - minutes * 60 * 1000);
    setFilters(prev => ({
      ...prev,
      start: start.toISOString(),  // Full ISO timestamp for precise filtering
      end: now.toISOString(),
    }));
    setActiveQuickFilter(label);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [filters]);

  async function fetchData() {
    try {
      const params = new URLSearchParams();
      if (filters.agent !== 'all') params.append('agent', filters.agent);
      if (filters.project !== 'all') params.append('project', filters.project);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.start) params.append('start', filters.start);
      if (filters.end) params.append('end', filters.end);

      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      setActivities(data.activities || []);
      setStats(data.stats || { total: 0, today: 0, week: 0 });
      if (data.filters) {
        setFilterOptions(data.filters);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Clear quick filter selection when dates are manually changed
    if (name === 'start' || name === 'end') {
      setActiveQuickFilter(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          🚀 Mission Control
        </h1>
        <span style={{ color: '#8b949e', fontSize: '14px' }}>
          Auto-refreshes every 10s
        </span>
      </header>

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Agent</label>
          <select 
            name="agent" 
            value={filters.agent} 
            onChange={handleFilterChange} 
            style={styles.select}
          >
            <option value="all">All Agents</option>
            {filterOptions.agents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Project</label>
          <select 
            name="project" 
            value={filters.project} 
            onChange={handleFilterChange} 
            style={styles.select}
          >
            <option value="all">All Projects</option>
            {filterOptions.projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Status</label>
          <select 
            name="status" 
            value={filters.status} 
            onChange={handleFilterChange} 
            style={styles.select}
          >
            <option value="all">All Statuses</option>
            {filterOptions.statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>From</label>
          <input 
            type="date" 
            name="start" 
            value={filters.start} 
            onChange={handleFilterChange} 
            style={styles.input}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>To</label>
          <input 
            type="date" 
            name="end" 
            value={filters.end} 
            onChange={handleFilterChange} 
            style={styles.input}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Quick</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {quickFilterOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => applyQuickFilter(opt.minutes, opt.label)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeQuickFilter === opt.label ? '#238636' : '#30363d',
                  color: activeQuickFilter === opt.label ? '#fff' : '#c9d1d9',
                  transition: 'background 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => {
            setFilters({ 
              agent: 'all', 
              project: 'all', 
              status: 'all', 
              start: defaultStart, 
              end: defaultEnd 
            });
            setActiveQuickFilter('24h');
          }}
          style={{
            ...styles.select,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid #30363d',
            color: '#8b949e'
          }}
        >
          Reset
        </button>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Activities</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Today</div>
          <div style={styles.statValue}>{stats.today}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>This Week</div>
          <div style={styles.statValue}>{stats.week}</div>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Action</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Agent</th>
            <th style={styles.th}>Project</th>
            <th style={styles.th}>Duration</th>
            <th style={styles.th}>Tokens</th>
            <th style={styles.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr key={act.id}>
              <td style={styles.td}>
                <strong>{act.action}</strong>
                {act.details && (
                  <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>
                    {act.details.substring(0, 100)}
                  </div>
                )}
              </td>
              <td style={styles.td}>
                <span style={styles.status(act.status)}>{act.status}</span>
              </td>
              <td style={styles.td}>
                {act.agent ? <span style={styles.badge}>{act.agent}</span> : '—'}
              </td>
              <td style={styles.td}>
                {act.project ? <span style={styles.badge}>{act.project}</span> : '—'}
              </td>
              <td style={styles.td}>{act.duration || '—'}</td>
              <td style={styles.td}>
                {act.totalTokens ? (
                  <div>
                    <div>{formatNumber(act.totalTokens)}</div>
                    {act.inputTokens && act.outputTokens && (
                      <div style={styles.tokenBreakdown}>
                        {formatNumber(act.inputTokens)} in / {formatNumber(act.outputTokens)} out
                      </div>
                    )}
                  </div>
                ) : '—'}
              </td>
              <td style={{ ...styles.td, color: '#8b949e', fontSize: '12px' }}>
                {new Date(act.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {activities.length === 0 && (
        <p style={{ textAlign: 'center', color: '#8b949e', padding: '40px' }}>
          No activities logged yet. Use <code>mc log "action"</code> to get started.
        </p>
      )}
    </div>
  );
}
