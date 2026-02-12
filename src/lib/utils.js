/**
 * Converts a string to PascalCase without spaces.
 * Example: "type alchemy" -> "TypeAlchemy"
 * Example: "type-alchemy" -> "TypeAlchemy"
 * Example: "mission_control" -> "MissionControl"
 * Example: "TypeAlchemy" -> "TypeAlchemy" (Idempotent)
 */
export function toPascalCase(str) {
  if (!str) return str;
  return str
    .replace(/([A-Z])/g, ' $1')
    .split(/[\s\-_]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Fuzzy match: checks if all characters of `query` appear in `text` in order.
 * Both `text` and `query` should be lowercase.
 */
export function isFuzzyMatch(text, query) {
  let queryIndex = 0;
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === query.length;
}

/**
 * Returns the appropriate time field from an activity record,
 * preferring `createdAt` and falling back to `timestamp`.
 */
export function getActivityTime(act) {
  return act.createdAt || act.timestamp;
}
