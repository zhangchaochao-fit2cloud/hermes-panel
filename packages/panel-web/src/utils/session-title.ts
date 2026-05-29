import type { SessionSummary } from '@hermes-panel/shared';

export function displaySessionTitle(session: Pick<SessionSummary, 'id' | 'title'>, fallback: string): string {
  const raw = session.title?.trim();
  if (raw && !looksGeneratedTitle(raw)) return cleanTitle(raw) ?? raw;
  return cleanTitle(raw ?? '') ?? fallback;
}

export function looksGeneratedTitle(title: string): boolean {
  const value = title.trim();
  if (!value) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return true;
  if (/^(run|sess|session|chat|cron|job|task|plan)[_-]?[a-z0-9._:-]{8,}$/i.test(value)) return true;
  if (/^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value)) return true;
  if (/^\d{8}([_-]?\d{4,6})?$/.test(value)) return true;
  if (/^[A-Z0-9][A-Z0-9._:-]{15,}$/i.test(value) && !/\s/.test(value)) return true;
  return false;
}

function cleanTitle(title: string): string | null {
  const cleaned = title
    .replace(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}[-_\s]*/g, '')
    .replace(/\b(plan|run|sess|session|chat|cron|job|task)[_-]?\d+\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(run|sess|session|chat|cron|job|task|plan)\s+[a-z0-9\s.:-]{8,}$/i.test(cleaned)) return null;
  if (/^\d[\d\s.:-]{7,}$/.test(cleaned)) return null;
  if (!cleaned || looksGeneratedTitle(cleaned)) return null;
  const chars = Array.from(cleaned);
  return chars.length > 30 ? `${chars.slice(0, 30).join('')}…` : cleaned;
}
