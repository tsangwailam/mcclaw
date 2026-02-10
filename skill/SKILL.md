---
name: mission-claw
description: Log agent activities to Mission Claw dashboard with token usage tracking. Use when completing significant tasks, subagent work, or any action worth recording in the activity feed. Triggers on task completion, activity logging, or tracking agent work.
---

# Mission Claw Activity Logging

Log significant tasks to the Mission Claw activity feed for tracking agent work, token usage, and project progress.

## CLI Usage

```bash
mclaw log "Task description" \
  --agent "AgentName" \
  --project "ProjectName" \
  --status completed \
  --duration "Xm Ys" \
  --input-tokens N \
  --output-tokens N \
  --total-tokens N
```

### Required Fields
- `action` - Brief task description (positional argument)
- `--agent` - Agent name (e.g., "J", "mission-control", "type-alchemy")
- `--total-tokens` - Total tokens used (**always include**)

### Optional Fields
- `--details` - Longer description of work done
- `--project` - Project name
- `--status` - `completed` (default), `in_progress`, or `failed`
- `--duration` - Time taken (e.g., "5m", "1h 30m")
- `--input-tokens` / `--output-tokens` - Token breakdown

## When to Log

Log after completing:
- Significant development tasks
- Bug fixes or feature implementations
- Research or investigation work
- Configuration changes
- Any task worth tracking

## Getting Token Usage

Before logging, check your session's token usage:
- Use `session_status` tool to see current tokens
- For subagents, tokens are in the completion announcement

## Examples

```bash
# Feature implementation
mclaw log "Added date-time filter to dashboard" \
  --agent "mission-control" \
  --project "Mission Claw" \
  --status completed \
  --duration "10m" \
  --total-tokens 15000

# Quick fix
mclaw log "Fixed timezone bug" \
  --agent "J" \
  --project "ContentMorph" \
  --duration "2m" \
  --total-tokens 3500

# In-progress work
mclaw log "Implementing payment flow" \
  --agent "J" \
  --project "TypeAlchemy" \
  --status in_progress
```

## Other Commands

```bash
mclaw list                    # Recent activities
mclaw list --agent J          # Filter by agent
mclaw status                  # Quick stats
mclaw dashboard start         # Start web dashboard
```

## API Alternative

POST to `http://localhost:3100/api/activity`:
```json
{
  "action": "Task name",
  "agent": "J",
  "project": "Project",
  "status": "completed",
  "totalTokens": 5000,
  "inputTokens": 4000,
  "outputTokens": 1000
}
```
