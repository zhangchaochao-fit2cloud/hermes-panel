/**
 * Compact number formatting. Renders large numbers in K/M/B units so they
 * fit inside StatCard tiles. We deliberately drop trailing zeros so values
 * like 1.0K render as "1K".
 */
export function formatCompact(value: number, fractionDigits: number = 1): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);

  if (abs < 1_000) {
    // Show integers as-is, small floats with up to fractionDigits precision
    return Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits);
  }

  let scaled: number;
  let suffix: string;
  if (abs < 1_000_000) {
    scaled = value / 1_000;
    suffix = 'K';
  } else if (abs < 1_000_000_000) {
    scaled = value / 1_000_000;
    suffix = 'M';
  } else {
    scaled = value / 1_000_000_000;
    suffix = 'B';
  }

  return `${trimTrailingZeros(scaled.toFixed(fractionDigits))}${suffix}`;
}

/**
 * Plain integer formatting with locale-aware thousands separators.
 * Use for token totals where users may want exact counts.
 */
export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * USD formatting like "$1.23" or "$1,234.56". Returns "$0.00" for non-finite.
 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function trimTrailingZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}
