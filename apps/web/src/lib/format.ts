/**
 * Hawkeye Formatting Utilities
 * Adheres strictly to ui-context.md standards:
 * - Units in names and strings (mm, %)
 * - Tabular 24-hour time
 * - Plant local format "DD MMM YYYY, HH:mm:ss"
 */

export function formatDimension(valueMm: number, isLength: boolean = false): string {
  if (isLength) {
    return `${Math.round(valueMm)} mm`;
  }
  return `${valueMm.toFixed(1)} mm`;
}

export function formatConfidence(fraction: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  return `${Math.round(clamped * 100)}%`;
}

export function formatTime(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDate(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()] ?? 'Jan';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateTime(dateOrIso: string | Date): string {
  return `${formatDate(dateOrIso)}, ${formatTime(dateOrIso)}`;
}
