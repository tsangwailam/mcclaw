# Mission Claw CLI

Mission Claw is a powerful activity logging CLI with a built-in background daemon and web dashboard. It helps you track agent tasks, tokens, and progress in real-time.

## Installation

```bash
# Install globally via npm
npm install -g mission-control
```

## Quick Start

1. **Start the daemon** (required for logging and dashboard):
   ```bash
   mcclaw daemon start
   ```

2. **Log an activity**:
   ```bash
   mcclaw log "Sample Activity" --details "This is a test log" --agent "Antigravity" --project "MissionControl"
   ```

3. **Open the dashboard**:
   ```bash
   mcclaw dashboard
   ```

## Usage

### Daemon Management
- `mcclaw daemon start` - Start the background server (port 3001)
- `mcclaw daemon stop` - Stop the background server
- `mcclaw daemon status` - Check if the daemon is running

### Logging & Viewing
- `mcclaw log "action" [options]` - Log a new activity
- `mcclaw list` - List recent activities in the terminal
- `mcclaw status` - Show quick statistics
- `mcclaw dashboard` - Open the web-based dashboard in your browser

### Configuration
- `mcclaw config show` - Show current configuration
- `mcclaw config set --db-url <url>` - Set a custom database URL (SQLite or PostgreSQL)

## Features
- **Daemon-based**: Fast CLI interactions, background processing.
- **Embedded Dashboard**: Visual representation of all your logged activities.
- **Cross-Database**: Supports local SQLite and remote PostgreSQL.
- **Token Tracking**: Specifically designed for tracking AI agent token usage.
