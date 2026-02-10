# Mission Claw Installation

Quick setup for agents to install and configure Mission Claw.

## 1. Install CLI

```bash
cd /home/tsangwailam/sambashare/mission-control-cli
npm install
npm link
```

Verify: `mclaw --help`

## 2. Database Setup

**SQLite (default):**
```bash
mclaw migrate
```

**PostgreSQL (optional):**
```bash
mclaw config set db-url "postgresql://user:pass@host:5432/missionclaw"
mclaw migrate
```

## 3. Start Daemon

```bash
mclaw daemon start
```

Check status: `mclaw daemon status`

## 4. OpenClaw Skill (Optional)

To enable the mission-claw skill for all agents:

```bash
# Create skill directory
mkdir -p ~/.openclaw/skills/mission-claw

# Copy skill file
cp /home/tsangwailam/sambashare/mission-control-cli/skill/SKILL.md ~/.openclaw/skills/mission-claw/
```

Then add to OpenClaw config (`~/.openclaw/openclaw.json`):
```json
{
  "skills": {
    "load": {
      "extraDirs": ["~/.openclaw/skills"]
    },
    "entries": {
      "mission-claw": { "enabled": true }
    }
  }
}
```

## 5. Verify

```bash
# Log a test activity
mclaw log "Test activity" --agent "test" --total-tokens 100

# Check it worked
mclaw list --limit 1
```

## Quick Commands

| Command | Description |
|---------|-------------|
| `mclaw daemon start` | Start background daemon |
| `mclaw daemon stop` | Stop daemon |
| `mclaw log "Task"` | Log an activity |
| `mclaw list` | View recent activities |
| `mclaw status` | Quick stats |
| `mclaw dashboard start` | Start web UI (port 3101) |

## Ports

- **3100** — API daemon
- **3101** — Web dashboard
