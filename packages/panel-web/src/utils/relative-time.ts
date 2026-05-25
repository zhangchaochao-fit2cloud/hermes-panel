/**
 * Format a unix ms timestamp into a localized relative time string.
 * Examples:
 *   zh-CN: "刚刚" / "2 分钟前" / "3 小时前" / "昨天" / "3 天前" / "2024-01-15"
 *   en-US: "just now" / "2m ago" / "3h ago" / "yesterday" / "3d ago" / "2024-01-15"
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type Locale = 'zh-CN' | 'en-US';

export function relativeTime(ts: number, locale: Locale = 'zh-CN', now: number = Date.now()): string {
  if (!ts || ts <= 0) return '-';
  const diff = now - ts;

  // Future timestamps (small skew) — fall through to "just now"
  if (diff < MIN) {
    return locale === 'zh-CN' ? '刚刚' : 'just now';
  }
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return locale === 'zh-CN' ? `${m} 分钟前` : `${m}m ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return locale === 'zh-CN' ? `${h} 小时前` : `${h}h ago`;
  }
  if (diff < 2 * DAY) {
    return locale === 'zh-CN' ? '昨天' : 'yesterday';
  }
  if (diff < 7 * DAY) {
    const d = Math.floor(diff / DAY);
    return locale === 'zh-CN' ? `${d} 天前` : `${d}d ago`;
  }

  // Older than a week — show absolute date
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function absoluteTime(ts: number): string {
  if (!ts || ts <= 0) return '-';
  const d = new Date(ts);
  return d.toLocaleString();
}
