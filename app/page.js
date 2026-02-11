'use client';

import { useEffect, useState } from 'react';
import { useActivityStream } from './hooks/useActivityStream.js';
import { LiveBadge } from './components/LiveBadge.js';

function formatNumber(n) {
  return n?.toLocaleString() ?? '—';
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const { isConnected, activities: wsActivities, useWebSocket, setUseWebSocket } = useActivityStream(3001);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [filterOptions, setFilterOptions] = useState({ agents: [], projects: [], statuses: [] });
  
  // Default to last 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const defaultStart = yesterday.toISOString();
  const defaultEnd = now.toISOString();

  const [filters, setFilters] = useState({
    agent: 'all',
    project: 'all',
    status: 'all',
    start: defaultStart,
    end: defaultEnd,
  });
  const [activeQuickFilter, setActiveQuickFilter] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const quickFilterOptions = [
    { label: '1h', minutes: 60 },
    { label: '6h', minutes: 360 },
    { label: '24h', minutes: 1440 },
    { label: '7d', minutes: 10080 },
    { label: '30d', minutes: 43200 },
  ];

  const applyQuickFilter = (minutes, label) => {
    const now = new Date();
    const start = new Date(now.getTime() - minutes * 60 * 1000);
    setFilters(prev => ({
      ...prev,
      start: start.toISOString(),
      end: now.toISOString(),
    }));
    setActiveQuickFilter(label);
    setCustomLabel('');
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    setFilters(prev => ({
      ...prev,
      start: s.toISOString(),
      end: e.toISOString(),
    }));
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    setCustomLabel(`${fmt(s)} – ${fmt(e)}`);
    setActiveQuickFilter('custom');
    setShowCustomPicker(false);
  };

  useEffect(() => {
    // Always fetch initial data on mount and when filters change
    fetchData();
    
    // If WebSocket is not being used, fall back to polling
    if (!useWebSocket) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [filters, useWebSocket]);

  // Update local activities when WebSocket receives new data
  useEffect(() => {
    if (wsActivities.length > 0 && useWebSocket) {
      // Filter WebSocket activities based on current filters and time range
      const filtered = wsActivities.filter(act => {
        const inTimeRange = new Date(act.createdAt) >= new Date(filters.start) && 
                           new Date(act.createdAt) <= new Date(filters.end);
        const matchesAgent = filters.agent === 'all' || act.agent === filters.agent;
        const matchesProject = filters.project === 'all' || act.project === filters.project;
        const matchesStatus = filters.status === 'all' || act.status === filters.status;
        
        return inTimeRange && matchesAgent && matchesProject && matchesStatus;
      });
      
      setActivities(filtered);
    }
  }, [wsActivities, filters, useWebSocket]);

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
    let newValue = value;
    if ((name === 'start' || name === 'end') && value) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          newValue = d.toISOString();
        }
      } catch (e) {
        newValue = value;
      }
    }
    setFilters(prev => ({ ...prev, [name]: newValue }));
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
          <span style={{ fontSize: '32px', lineHeight: 1 }}>🦀</span>
          <span>Mission <span style={{ color: '#f0883e' }}>Claw</span></span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveBadge isConnected={isConnected} useWebSocket={useWebSocket} />
          <span style={{ color: '#8b949e', fontSize: '12px' }}>
            {useWebSocket ? 'Live updates' : 'Auto-refreshes 10s'}
          </span>
          <a
            href="/search"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #8b5cf6',
              background: 'transparent',
              color: '#8b5cf6',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.style.background = '#8b5cf6'; e.style.color = '#fff'; }}
            onMouseLeave={e => { e.style.background = 'transparent'; e.style.color = '#8b5cf6'; }}
            title="Search activities"
          >
            🔍 Search
          </a>
          <a
            href="/agents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #58a6ff',
              background: 'transparent',
              color: '#58a6ff',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.style.background = '#58a6ff'; e.style.color = '#fff'; }}
            onMouseLeave={e => { e.style.background = 'transparent'; e.style.color = '#58a6ff'; }}
            title="View agent analytics"
          >
            📊 Analytics
          </a>
          <button
            onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #f0883e',
              background: 'transparent',
              color: '#f0883e',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = '#f0883e'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#f0883e'; }}
            title="Refresh activity list"
          >
            ↻ Refresh
          </button>
        </div>
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
          <label style={styles.label}>Time Range</label>
          <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
            {quickFilterOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => applyQuickFilter(opt.minutes, opt.label)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: activeQuickFilter === opt.label ? '1px solid #f0883e' : '1px solid transparent',
                  cursor: 'pointer',
                  background: activeQuickFilter === opt.label ? '#f0883e22' : '#30363d',
                  color: activeQuickFilter === opt.label ? '#f0883e' : '#c9d1d9',
                  transition: 'all 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (!showCustomPicker) {
                  setCustomStart(formatDateForInput(filters.start));
                  setCustomEnd(formatDateForInput(filters.end));
                }
                setShowCustomPicker(!showCustomPicker);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '6px',
                border: activeQuickFilter === 'custom' ? '1px solid #f0883e' : '1px solid transparent',
                cursor: 'pointer',
                background: activeQuickFilter === 'custom' ? '#f0883e22' : '#30363d',
                color: activeQuickFilter === 'custom' ? '#f0883e' : '#c9d1d9',
                transition: 'all 0.2s',
              }}
            >
              {activeQuickFilter === 'custom' && customLabel ? customLabel : 'Custom'}
            </button>
            {showCustomPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '16px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '260px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.label}>Start</label>
                  <input
                    type="datetime-local"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.label}>End</label>
                  <input
                    type="datetime-local"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #30363d',
                      background: 'transparent',
                      color: '#8b949e',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyCustomRange}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '1px solid #f0883e',
                      background: '#f0883e',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
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
            color: '#8b949e',
            fontSize: '12px',
          }}
        >
          ✕ Reset
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
                {act.project ? (
                  <a
                    href={`/projects/${encodeURIComponent(act.project)}`}
                    style={{ ...styles.badge, cursor: 'pointer', textDecoration: 'none', borderBottom: '1px solid #58a6ff', color: '#58a6ff' }}
                  >
                    {act.project}
                  </a>
                ) : '—'}
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
