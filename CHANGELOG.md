# Changelog

All notable changes to the Mission Claw project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-02-11

### Features Added

#### 🎨 UI/UX Enhancements
- **Crab Logo Branding (🦀)**: Updated project logo from rocket (🚀) to crab emoji with orange "Claw" branding
  - Logo appears in dashboard header with 32px size
  - Orange accent color (#f0883e) for enhanced visual identity
  - Updated page title to include crab emoji

- **Prominent Refresh Button**: Added manually triggered data refresh
  - Orange accent color to match branding
  - Located in top-right corner next to filter controls
  - Allows users to force-refresh the activity list on demand
  - Keyboard-friendly with title tooltip

- **Compact Time Filter UI**: Replaced verbose datetime-local inputs with quick-filter buttons
  - Quick preset buttons: 1h, 6h, 24h, 7d, 30d
  - Eliminated text inputs for streamlined interface
  - Preset buttons are clearly labeled and easy to click
  - Active filter highlighted for clear visual feedback

#### 📅 Custom Date Range Picker
- **Custom Date Range Selector**: New "Custom" button in the quick-filter row
  - Toggleable dropdown with start/end datetime-local inputs
  - Apply and Cancel buttons for user control
  - Shows selected range label (e.g., "11 Jan – 11 Feb") on the Custom button
  - Orange accent highlighting when custom range is active
  - Dropdown closes after applying a custom range
  - Switching to preset ranges automatically clears custom selection

#### 📊 Project Details Dashboard
- **New Route**: `/projects/[projectName]` with dedicated project analytics page
  - Accessible by clicking project names in the main dashboard
  - Consistent dark theme matching main dashboard styling

- **Project Metrics Section**:
  - Total Tasks: Count of all activities for the project
  - Completed: Number of successfully completed tasks
  - Failed: Number of failed tasks
  - In Progress: Number of ongoing tasks
  - Completion Rate: Percentage of completed tasks (green percentage display)
  - Total Tokens: Sum of all tokens consumed

- **Daily Token Usage Chart**:
  - Interactive recharts bar chart showing token consumption by date (last 30 days)
  - Stacked bars showing breakdown by task status (completed/failed/in_progress)
  - Color-coded: Green (completed), Red (failed), Orange (in_progress)
  - Custom tooltip with formatted numbers
  - Responsive to data updates

- **Top Agents Section**:
  - Displays most active agents for the project
  - Limited to top 5 agents by activity count
  - Agent badges with activity count indicators
  - Helps identify which agents are most engaged with the project

- **Sortable Activities Table**:
  - Recent activities filtered to project
  - Sortable columns: Agent, Action, Details, Status, Duration, Created At
  - Status filter dropdown (all/completed/failed/in_progress)
  - Formatted timestamps and durations
  - Status badges with color coding
  - Clickable column headers to toggle sort direction

#### 🔧 CLI/Daemon Improvements
- **Enhanced Status Output**: `mclaw status` command now shows:
  - Service health: Daemon (API) status on port 3100
  - Dashboard status on port 3101
  - Database connectivity status

- **--port Flag**: Added to `mclaw dashboard start` command
  - Allows custom port specification for dashboard
  - Default remains 3001 if not specified

- **Service Management**: Graceful process handling
  - SIGTERM before SIGKILL for clean shutdown
  - Proper health checks for dashboard/daemon connectivity

### Bug Fixes

- **Prisma Client Lifecycle**: Fixed CLI vs Server separation
  - CLI commands now use short-lived standalone Prisma clients
  - Server maintains persistent cached client
  - Proper client disconnection on database URL changes
  - Prevents connection pool exhaustion

- **Input Validation**: Enhanced API endpoint robustness
  - GET `/api/activity` and `/api/activity/stats` wrapped in try/catch
  - POST endpoint validates 'action' field presence and non-empty requirement
  - POST endpoint validates 'status' field against allowed values
  - Comprehensive error handling with meaningful responses

- **Dashboard Health Check**: Added missing await in dashboardStatus()
  - Ensures health checks complete before timeout
  - Proper promise resolution

### Database & Configuration

- **Version Synchronization**: Unified version to 1.0.0
  - package.json version: 1.0.0
  - CLI entry point synchronized

- **Rebranding**: Mission Control → Mission Claw
  - Package name: mission-control → mission-claw
  - CLI command: mc → mclaw
  - SQLite database: mission-control.db → mclaw.db
  - All help texts and error messages updated
  - Comments and documentation updated throughout

- **Dependencies Updated**:
  - recharts: ^3.7.0 (for advanced charting)
  - Prisma and @prisma/client: ^6.3.1
  - Next.js: ^14.2.21
  - React: ^18.3.1

### Technical Details

#### Dashboard Performance
- Activities fetched with 500-item limit from API
- 10-second auto-refresh interval on main dashboard
- Efficient data aggregation for metrics computation
- Optimized re-renders with React hooks

#### Styling & Theme
- Dark theme throughout (GitHub-inspired palette)
- Background: #0d1117, #161b22, #21262d
- Text: #c9d1d9, #8b949e
- Accent colors: #58a6ff (blue), #238636 (green), #da3633 (red), #9e6a03 (orange)
- Responsive grid layouts using CSS flexbox

#### API Endpoints Enhanced
- `GET /api/activity?project=...&limit=...` - Fetch activities by project
- `GET /api/activity?agent=...&project=...&status=...&start=...&end=...` - Comprehensive filtering
- `GET /api/activity/stats` - Aggregate statistics

### Files Modified

Core Dashboard:
- `app/page.js` - Main dashboard with refresh button, quick filters, custom date picker
- `app/projects/[projectName]/page.js` - New project details page with charts

Configuration:
- `package.json` - Version sync, new dependencies (recharts)
- `bin/mclaw.js` - CLI entry point updates

### Known Limitations

- Project names are case-sensitive when filtering
- Custom date range picker requires valid ISO 8601 format
- Charts are limited to last 30 days of data
- Activity table shows most recent 500 items per project

### Future Improvements

- Export functionality for activity reports
- Advanced filtering (date range presets for common business periods)
- Real-time activity stream with WebSocket support
- Agent-specific analytics dashboards
- Cost analysis and token burn rate projections
- Data retention policies and archival
- Activity search with full-text capabilities

---

## Git Commit History (Feb 10-11, 2026)

```
f2a166c Merge branch 'feature/project-details'
ef9c2ea Add Project Details page with charts, metrics, and activity table
46acdee feat(dashboard): add Custom button to datetime filter with date picker dropdown
ca72095 Enhance dashboard: refresh button, compact time filter, crab logo
722c2ad docs: update skill metadata for ClawHub publishing
1f37494 Merge pull request #2 from tsangwailam/feat/skill
663caa1 feat: add service status (daemon/dashboard/db) to mclaw status output
d336306 fix: synchronize version to 1.0.0 in package.json and CLI entry point
6090e24 fix: add input validation and try/catch error handling to API endpoints
64cbee4 fix: separate Prisma client lifecycle for CLI vs server
b6cc59f fix: use SIGTERM before SIGKILL for graceful process shutdown
0c333f5 feat: add --port flag to dashboard start command
412a384 fix: add missing await in dashboardStatus() health check
638b575 fix: rename stale mission-control/mc references to mission-claw/mclaw
f7c4c75 Enhance README with installation instructions and image
6bd64d1 Merge pull request #1 from tsangwailam/feat/skill
```

---

## Installation

```bash
npm install mission-claw
mclaw daemon start
mclaw dashboard
```

Visit http://localhost:3101 to view the dashboard.

---

## Support

For issues, feature requests, or contributions, please visit: https://github.com/tsangwailam/mcclaw
