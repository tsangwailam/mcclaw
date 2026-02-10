/**
 * Converts a string to CamelCase (PascalCase) without spaces.
 * Example: "type alchemy" -> "TypeAlchemy"
 * Example: "type-alchemy" -> "TypeAlchemy"
 * Example: "mission_control" -> "MissionControl"
 * Example: "TypeAlchemy" -> "TypeAlchemy" (Idempotent)
 */
export function toCamelCase(str) {
  if (!str) return str;
  return str
    .replace(/([A-Z])/g, ' $1')
    .split(/[\s\-_]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
