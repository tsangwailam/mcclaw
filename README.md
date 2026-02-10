# Mission Claw CLI

Mission Claw is a powerful activity logging CLI with a built-in background daemon and web dashboard. It helps you track agent tasks, tokens, and progress in real-time.

![mclaw](https://github.com/user-attachments/assets/0d5a419d-5148-43cf-93f4-f4d78d4f03dc)

# Express Install from OpenClaw

Paste the following instruction into openclaw chat

```
Follow instruction here to install Mission Claw. 
https://github.com/tsangwailam/mcclaw/blob/main/INSTALL.md
```

## Installation

```bash
# Install globally via npm
npm install -g mission-control
```

## Quick Start

1. **Start the daemon** (required for logging and dashboard):
   ```bash
   mclaw daemon start
   ```

2. **Log an activity**:
   ```bash
   mclaw log "Sample Activity" --details "This is a test log" --agent "Antigravity" --project "MissionControl"
   ```

3. **Open the dashboard**:
   ```bash
   mclaw dashboard start
   ```

## Usage

### Daemon Management
- `mclaw daemon start` - Start the background server (port 3100)
- `mclaw daemon stop` - Stop the background server
- `mclaw daemon status` - Check if the daemon is running

### Logging & Viewing
- `mclaw log "action" [options]` - Log a new activity
- `mclaw list` - List recent activities in the terminal
- `mclaw status` - Show quick statistics
- `mclaw dashboard start` - Start the web-based dashboard (port 3101)

### Configuration
- `mclaw config show` - Show current configuration
- `mclaw config set db-url <url>` - Set a custom database URL (SQLite or PostgreSQL)

## OpenClaw Integration

To enable the `mission-claw` skill for your agents, add the skill directory to your OpenClaw configuration.

1.  **Find the skill path**:
    ```bash
    # The skill is located in the package directory
    echo "$(npm root -g)/mission-control/skill"
    ```

2.  **Add to OpenClaw config** (`~/.openclaw/openclaw.json`):
    ```json
    {
      "skills": {
        "load": {
          "extraDirs": ["/path/to/global/node_modules/mission-control/skill"]
        },
        "entries": {
          "mission-claw": { "enabled": true }
        }
      }
    }
    ```

For detailed setup instructions, including database configuration and manual installation steps, see [INSTALL.md](./INSTALL.md).

## Features
- **Daemon-based**: Fast CLI interactions, background processing.
- **Embedded Dashboard**: Visual representation of all your logged activities.
- **Cross-Database**: Supports local SQLite and remote PostgreSQL.
- **Token Tracking**: Specifically designed for tracking AI agent token usage.
