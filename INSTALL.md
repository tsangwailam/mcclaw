# Mission Claw Installation

Quick setup for agents to install and configure Mission Claw.

## 1. Install CLI

```bash
npm install -g mission-control
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
# The skill is included in the package. Add its location to OpenClaw's extraDirs:
# You can find the global path with: npm root -g
# e.g. path: $(npm root -g)/mission-control/skill
```

Then add to OpenClaw config (`~/.openclaw/openclaw.json`):
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

## 5. Verify

```bash
# Log a test activity
mclaw log "Test activity" --agent "test" --total-tokens 100

# Check it worked
mclaw list --limit 1
```

## Agent Usage

Agents should log all significant tasks upon completion.

**Standard Logging Command:**
```bash
mclaw log "Description of work" \
  --agent "YourName" \
  --project "ProjectName" \
  --status completed \
  --total-tokens N \
  --duration "Xm Ys"
```

**Guidelines:**
- **Tokens**: Always include `--total-tokens` for cost tracking.
- **Automation**: If using OpenClaw, enabling the `mission-claw` skill (see Step 4) will provide the agent with these instructions automatically.

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
