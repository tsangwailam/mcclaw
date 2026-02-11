'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
  searchBox: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    background: '#161b22',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #30363d',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    background: '#0d1117',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '6px',
    border: '1px solid #f0883e',
    background: '#f0883e',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
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
  resultsContainer: {
    background: '#161b22',
    borderRadius: '8px',
    border: '1px solid #30363d',
    overflow: 'hidden',
  },
  resultItem: {
    padding: '16px',
    borderBottom: '1px solid #30363d',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  resultAction: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: '8px',
  },
  resultDetails: {
    fontSize: '13px',
    color: '#8b949e',
    marginBottom: '8px',
    maxWidth: '600px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6e7681',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#30363d',
    color: '#c9d1d9',
    fontSize: '12px',
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
  emptyState: {
    padding: '40px 16px',
    textAlign: 'center',
    color: '#8b949e',
  },
  autocompleteList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#161b22',
    border: '1px solid #30363d',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 10,
  },
  autocompleteItem: {
    padding: '8px 12px',
    borderBottom: '1px solid #30363d',
    cursor: 'pointer',
    color: '#8b949e',
    fontSize: '13px',
  },
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const [filters, setFilters] = useState({
    agent: '',
    project: '',
    status: '',
    after: '',
    before: '',
    fuzzy: false,
  });

  const [filterOptions, setFilterOptions] = useState({
    agents: [],
    projects: [],
    statuses: [],
  });

  // Load search history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history);
  }, []);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const data = await res.json();
          if (data.filters) {
            setFilterOptions(data.filters);
          }
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    fetchFilterOptions();
  }, []);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('q', keyword);
      if (filters.agent) params.append('agent', filters.agent);
      if (filters.project) params.append('project', filters.project);
      if (filters.status) params.append('status', filters.status);
      if (filters.after) params.append('after', filters.after);
      if (filters.before) params.append('before', filters.before);
      if (filters.fuzzy) params.append('fuzzy', 'true');

      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);

        // Add to search history
        const newHistory = [keyword, ...searchHistory.filter(h => h !== keyword)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle autocomplete
  const handleKeywordChange = async (value) => {
    setKeyword(value);
    if (value.length > 2) {
      try {
        const res = await fetch(`/api/search/autocomplete?type=actions&prefix=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔍 Advanced Search</h1>
        <p style={{ color: '#8b949e' }}>Search activities with full-text search and advanced filters</p>
      </div>

      <form onSubmit={handleSearch} style={styles.searchBox}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder='Search activities... (e.g., "deploy", "error", "build")'
            style={styles.searchInput}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.autocompleteList}>
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  style={styles.autocompleteItem}
                  onClick={() => {
                    setKeyword(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" style={styles.button}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div style={styles.filterSection}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Agent</label>
          <select
            value={filters.agent}
            onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
            style={styles.select}
          >
            <option value="">All Agents</option>
            {filterOptions.agents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Project</label>
          <select
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
            style={styles.select}
          >
            <option value="">All Projects</option>
            {filterOptions.projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={styles.select}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>After</label>
          <input
            type="date"
            value={filters.after}
            onChange={(e) => setFilters({ ...filters, after: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Before</label>
          <input
            type="date"
            value={filters.before}
            onChange={(e) => setFilters({ ...filters, before: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={{ ...styles.label, display: 'block', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.fuzzy}
              onChange={(e) => setFilters({ ...filters, fuzzy: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            Fuzzy Match
          </label>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom: '24px', color: '#8b949e', fontSize: '13px' }}>
          Found {results.length} result{results.length !== 1 ? 's' : ''} for "{keyword}"
        </div>
      )}

      <div style={styles.resultsContainer}>
        {results.length > 0 ? (
          results.map((result) => (
            <div
              key={result.id}
              style={styles.resultItem}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={styles.resultAction}>{result.action}</div>
              {result.details && result.details !== result.action && (
                <div style={styles.resultDetails}>{result.details}</div>
              )}
              <div style={styles.resultMeta}>
                <span style={styles.status(result.status)}>{result.status}</span>
                {result.agent && <span style={styles.badge}>{result.agent}</span>}
                {result.project && <span style={styles.badge}>{result.project}</span>}
                <span style={{ color: '#6e7681' }}>
                  {new Date(result.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        ) : keyword ? (
          <div style={styles.emptyState}>
            <p>No results found for "{keyword}"</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Try adjusting your search or filters</p>
          </div>
        ) : searchHistory.length > 0 ? (
          <div style={{ padding: '16px' }}>
            <p style={{ color: '#8b949e', fontSize: '12px', marginBottom: '12px' }}>Recent Searches:</p>
            {searchHistory.map((item, i) => (
              <button
                key={i}
                onClick={() => { setKeyword(item); }}
                style={{
                  display: 'inline-block',
                  margin: '4px',
                  padding: '6px 12px',
                  background: '#30363d',
                  color: '#c9d1d9',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>Enter a search query to get started</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Supports full-text search of actions and details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
