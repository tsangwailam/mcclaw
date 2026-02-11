# Mission Claw Changelog - February 2026

## Summary
This document captures all features, refinements, and bug fixes delivered to the Mission Claw dashboard and CLI during February 10-11, 2026.

---

## Session Overview
- **Period**: February 10-11, 2026
- **Release**: v1.0.0
- **Focus**: Dashboard UX/UI overhaul, project analytics, custom date filtering

---

## ✨ Features Added

### 1. Crab Logo Branding (🦀)
**Commit**: `ca72095`

**What Changed**:
- Replaced rocket emoji (🚀) with crab emoji (🦀) in dashboard header
- Applied orange accent color (#f0883e) to logo
- Updated page title to reflect new branding

**Impact**: Visual identity refresh for the Mission Claw project, making it more memorable and distinct

**Code Changes**:
- Logo in header: `<span style={{ fontSize: '32px', lineHeight: 1 }}>🦀</span>`
- Orange styling on brand color elements

---

### 2. Refresh Button
**Commit**: `ca72095`

**What Changed**:
- Added prominent "Refresh" button in dashboard header
- Orange accent color matching crab branding
- Manual data refresh capability (in addition to auto-refresh every 10s)
- Tooltip: "Refresh activity list"

**Why It Matters**:
- Users can immediately see new activities without waiting for auto-refresh
- Provides manual control over data freshness

**Implementation**:
```javascript
<button onClick={refreshData} title="Refresh activity list">
  ↻ Refresh
</button>
```

---

### 3. Compact Time Filter UI
**Commit**: `ca72095`

**What Changed**:
- Replaced verbose datetime-local text inputs with quick-filter buttons
- Added preset buttons: **1h**, **6h**, **24h**, **7d**, **30d**
- Reduced visual clutter in filter bar
- Clear indication of active filter

**Before**: Two large text input fields for start/end times
**After**: 5 simple buttons + Custom option

**Benefits**:
- Faster filtering for common time ranges
- Mobile-friendly compact layout
- Cleaner, more intuitive UI

---

### 4. Custom Date Range Picker
**Commit**: `46acdee`

**What Changed**:
- Added "Custom" button to quick-filter row
- Toggleable dropdown with:
  - Start datetime-local input
  - End datetime-local input
  - Apply button
  - Cancel button
- Shows selected range on button (e.g., "11 Jan – 11 Feb")
- Orange highlight when custom range is active
- Dropdown closes after applying range
- Switching to preset ranges clears custom selection

**Why It Matters**:
- Users can specify exact date ranges for detailed analysis
- Supports business-specific time periods (quarters, custom fiscal years)
- Maintains preset convenience + custom flexibility

**Technical Details**:
- Uses datetime-local input type (native browser support)
- Validates start < end before applying
- Stores current range in state for UI persistence

---

### 5. Project Details Dashboard
**Commit**: `ef9c2ea`

**New Route**: `/projects/[projectName]`

#### 5.1 Project Metrics Card
Displays key project KPIs:
- **Total Tasks**: All activities for the project
- **Completed**: Successfully finished tasks
- **Failed**: Failed tasks  
- **In Progress**: Ongoing tasks
- **Completion Rate**: Percentage (colored green when >50%)
- **Total Tokens**: Sum of all token usage

**Layout**: Responsive grid, 2-3 columns depending on screen size

#### 5.2 Daily Token Usage Chart
- **Type**: Recharts BarChart (stacked bars)
- **Time Range**: Last 30 days
- **Breakdown**: By status (completed, failed, in_progress)
- **Colors**: 
  - Green (#238636) = completed
  - Red (#da3633) = failed
  - Orange (#9e6a03) = in_progress
- **Interactivity**: Custom tooltip with formatted numbers

**Data Flow**:
```
Activities → Group by date → Sum tokens by status → Render chart
```

#### 5.3 Top Agents Section
- Lists most active agents for the project
- Limited to top 5 by activity count
- Badge-style display with activity count
- Helps identify power users and engagement patterns

#### 5.4 Activities Table
- Shows recent project activities (up to 500 items)
- **Sortable columns**: Agent, Action, Details, Status, Duration, Created At
- **Filterable by status**: All / Completed / Failed / In Progress
- **Status badges**: Color-coded with text labels
- **Formatted data**: 
  - Timestamps: Relative (e.g., "2 hours ago")
  - Durations: "23m 45s" format

**Navigation**:
- Back button to return to main dashboard
- Project name clickable from main dashboard to access details

---

### 6. Enhanced Service Status Output
**Commit**: `663caa1`

**What Changed**:
- `mclaw status` command now displays:
  - Daemon (API) health check (port 3100)
  - Dashboard health check (port 3101)
  - Database connectivity status

**Why It Matters**:
- Users can quickly diagnose service issues
- Helpful for troubleshooting connection problems

---

### 7. Dashboard --port Flag
**Commit**: `0c333f5`

**What Changed**:
- Added `--port` flag to `mclaw dashboard start` command
- Allows custom port specification (default: 3001)

**Usage**:
```bash
mclaw dashboard start --port 3002
```

**Benefits**: 
- Multiple dashboard instances on different ports
- Flexible deployment in containerized environments

---

## 🐛 Bug Fixes

### 1. Prisma Client Lifecycle Management
**Commit**: `64cbee4`

**Issue**: CLI and server were sharing Prisma client, causing connection pool exhaustion

**Solution**:
- Introduced `createPrismaClient()` for short-lived CLI operations
- CLI commands disconnect after execution
- Server maintains persistent cached client
- Proper cleanup on database URL changes

**Impact**: Resolved memory leaks and connection pool issues in long-running scenarios

---

### 2. API Input Validation
**Commit**: `6090e24`

**Issue**: API endpoints lacked input validation, risking invalid data

**Changes**:
- `GET /api/activity`: Wrapped in try/catch
- `GET /api/activity/stats`: Wrapped in try/catch
- `POST /api/activity`: Validates:
  - 'action' field is present and non-empty
  - 'status' field is in allowed values (completed/failed/in_progress)
- Comprehensive error messages

**Impact**: Increased API robustness and security

---

### 3. Dashboard Health Check
**Commit**: `412a384`

**Issue**: dashboardStatus() function didn't await promise, causing race conditions

**Fix**: Added `await` to health check HTTP request

**Impact**: Reliable service status reporting

---

### 4. Graceful Process Shutdown
**Commit**: `b6cc59f`

**What Changed**: 
- Implemented SIGTERM before SIGKILL shutdown sequence
- Allows services to cleanup resources properly

**Impact**: Clean shutdown without dangling processes or incomplete transactions

---

## 🔄 Rebranding: Mission Control → Mission Claw

**Commit**: `638b575`

Updated all references across the codebase:

| Item | Before | After |
|------|--------|-------|
| Package name | mission-control | mission-claw |
| CLI command | mc | mclaw |
| Database name | mission-control.db | mclaw.db |
| Help texts | All updated | All updated |
| Comments | All updated | All updated |

**Impact**: Consistent branding across all user touchpoints

---

## 📦 Version & Dependencies

### Version Sync
**Commit**: `d336306`
- Unified version to **1.0.0**
- Synchronized package.json and CLI entry point

### Dependencies
```json
{
  "next": "^14.2.21",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "recharts": "^3.7.0",
  "@prisma/client": "^6.3.1",
  "prisma": "^6.3.1"
}
```

**Notable Addition**: `recharts` for advanced charting on project details page

---

## 📊 Data & Schema

### Database
- SQLite (default): `~/.mc/data/mclaw.db`
- Schema version: Initial (20260209173424)
- No schema changes in this session

### API Endpoints Enhanced
1. `GET /api/activity?project=X&limit=500` - Project-specific activities
2. `GET /api/activity?agent=X&project=X&status=X&start=ISO&end=ISO` - Advanced filtering
3. `GET /api/activity/stats` - Aggregate dashboard stats

---

## 🎨 Design & Theme

### Color Palette (Dark Theme)
- **Background**: 
  - Primary: #0d1117
  - Secondary: #161b22
  - Tertiary: #21262d
  
- **Text**:
  - Primary: #c9d1d9
  - Secondary: #8b949e
  
- **Accents**:
  - Blue (info): #58a6ff
  - Green (success): #238636
  - Red (error): #da3633
  - Orange (claw): #f0883e

### Responsive Breakpoints
- Mobile: Grid collapses to 1 column
- Tablet: 2 columns
- Desktop: 3+ columns

---

## 🧪 Testing Notes

### Tested Features
✅ Refresh button functionality
✅ Quick filter presets (1h, 6h, 24h, 7d, 30d)
✅ Custom date range picker with dropdown
✅ Project details page navigation and rendering
✅ Token usage chart with stacked bars
✅ Activities table sorting and filtering
✅ Service status reporting
✅ Database connectivity checks

### Known Limitations
- Project names are case-sensitive
- Charts limited to 30 days of historical data
- Activity table shows max 500 most recent items
- Custom date picker requires valid ISO 8601 format

---

## 📝 Commits Summary

| Hash | Type | Message |
|------|------|---------|
| f2a166c | merge | Merge branch 'feature/project-details' |
| ef9c2ea | feat | Add Project Details page with charts, metrics, and activity table |
| 46acdee | feat | Add Custom button to datetime filter with date picker dropdown |
| ca72095 | feat | Enhance dashboard: refresh button, compact time filter, crab logo |
| 722c2ad | docs | Update skill metadata for ClawHub publishing |
| 663caa1 | feat | Add service status (daemon/dashboard/db) to mclaw status output |
| d336306 | fix | Synchronize version to 1.0.0 |
| 6090e24 | fix | Add input validation and error handling to API endpoints |
| 64cbee4 | fix | Separate Prisma client lifecycle for CLI vs server |
| b6cc59f | fix | Use SIGTERM before SIGKILL for graceful shutdown |
| 0c333f5 | feat | Add --port flag to dashboard start command |
| 412a384 | fix | Add missing await in dashboardStatus() health check |
| 638b575 | fix | Rename mission-control refs to mission-claw |

---

## 🚀 Next Steps

Recommended future work:
1. Export functionality (CSV/PDF activity reports)
2. Agent-specific analytics dashboards
3. Cost analysis and token burn rate projections
4. Real-time activity stream with WebSocket
5. Advanced search with full-text capabilities
6. Data retention policies and archival
7. Activity templates and quick-log shortcuts
8. Integration with external monitoring tools

---

## 📌 Release Notes

**Mission Claw v1.0.0** successfully launched with:
- ✅ Complete UI overhaul with modern, compact design
- ✅ Advanced project analytics dashboard
- ✅ Flexible time filtering with presets and custom ranges
- ✅ Improved CLI reliability and error handling
- ✅ Consistent branding throughout
- ✅ Professional dark theme inspired by GitHub

Ready for production use.
