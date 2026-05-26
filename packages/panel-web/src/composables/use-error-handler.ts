import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { BffApiError } from '@/api/bff';

/**
 * Unified error handling layer for panel-web.
 *
 * Why this exists: today call sites do silent `catch {}`, bare
 * `console.error`, or `useMessage().error(...)` with ad-hoc strings.
 * That swallows context the dev needs and surfaces inconsistent UX.
 * `useErrorHandler` collapses all three into a single API:
 *
 *   const { withErrorToast, reportError, silenceError } = useErrorHandler();
 *
 *   // wrap an async action
 *   const r = await withErrorToast(store.doX(), { fallbackMessage: t('error.unknown') });
 *
 *   // inside a catch
 *   try { ... } catch (err) { reportError(err, { fallbackMessage: 'failed' }); }
 *
 *   // intentionally swallow
 *   try { ... } catch (err) { silenceError(err); }
 *
 * All console output is prefixed with `[panel]` for easy grep.
 */

export interface ReportErrorOptions {
  /** Plain-text fallback shown in the toast when no better label exists. */
  fallbackMessage?: string;
  /**
   * Optional i18n key resolved via vue-i18n. Takes precedence over
   * fallbackMessage. If the key resolves back to itself (missing key),
   * we fall back to fallbackMessage.
   */
  i18nKey?: string;
  /**
   * Error codes (from BffApiError.code or generic `code` properties)
   * that should be treated as silent no-ops. Matches `silenceError`
   * behavior: console.debug only, no toast.
   */
  silentCodes?: readonly string[];
  /** Skip the toast (still logs). */
  noToast?: boolean;
}

export interface WithErrorToastOptions extends ReportErrorOptions {}

/**
 * Narrow an unknown value into something we can inspect for code/message.
 * Returns `{ code, message, stack, original }` where `original` is the
 * raw value (we never throw it away — the dev console may want it).
 */
function narrowError(err: unknown): {
  code: string;
  message: string;
  stack: string | undefined;
  original: unknown;
} {
  if (err instanceof BffApiError) {
    return { code: err.code, message: err.message, stack: err.stack, original: err };
  }
  if (err instanceof Error) {
    // Some libraries stash a `code` on Error subclasses (Node-style).
    const maybeCode = (err as unknown as { code?: unknown }).code;
    const code = typeof maybeCode === 'string' ? maybeCode : err.name || 'ERROR';
    return { code, message: err.message, stack: err.stack, original: err };
  }
  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>;
    const code = typeof rec.code === 'string' ? rec.code : 'UNKNOWN';
    const message =
      typeof rec.message === 'string' ? rec.message : safeStringify(err);
    return { code, message, stack: undefined, original: err };
  }
  if (typeof err === 'string') {
    return { code: 'STRING_ERROR', message: err, stack: undefined, original: err };
  }
  return { code: 'UNKNOWN', message: safeStringify(err), stack: undefined, original: err };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface ErrorHandler {
  /**
   * Surface an error: toast + grouped console log. Returns the narrowed
   * info in case the caller wants to inspect (e.g. switch on code).
   */
  reportError: (
    err: unknown,
    opts?: ReportErrorOptions,
  ) => { code: string; message: string; silenced: boolean };
  /**
   * Wrap a promise. On success returns the resolved value; on rejection
   * calls reportError and returns undefined. Never re-throws — the caller
   * gets `undefined | T` and can branch on it.
   */
  withErrorToast: <T>(
    promise: Promise<T>,
    opts?: WithErrorToastOptions,
  ) => Promise<T | undefined>;
  /**
   * Mark an intentional swallow. Logs at `console.debug` so we keep a
   * breadcrumb without polluting the user's screen.
   */
  silenceError: (err: unknown) => void;
}

export function useErrorHandler(): ErrorHandler {
  // useMessage() must be called inside setup. We capture it lazily via
  // closures over the message instance so callers don't have to re-call
  // useErrorHandler() at every use site. If the composable is invoked
  // outside a NMessageProvider, naive-ui logs a warning — we still log
  // to the console so debugging isn't blocked.
  let message: ReturnType<typeof useMessage> | undefined;
  try {
    message = useMessage();
  } catch {
    message = undefined;
  }

  let i18n: ReturnType<typeof useI18n> | undefined;
  try {
    i18n = useI18n();
  } catch {
    i18n = undefined;
  }

  function resolveLabel(opts: ReportErrorOptions | undefined, code: string, fallback: string): string {
    // 1. explicit i18n key → resolve through vue-i18n; if it returns
    //    the key unchanged (missing translation), drop to fallback.
    if (opts?.i18nKey && i18n) {
      const resolved = i18n.t(opts.i18nKey);
      if (resolved && resolved !== opts.i18nKey) return resolved;
    }
    // 2. plain fallback message provided by the caller wins next.
    if (opts?.fallbackMessage) return opts.fallbackMessage;
    // 3. last resort: i18n key `error.<code>` or `error.unknown`.
    if (i18n) {
      const byCode = i18n.t(`error.${code.toLowerCase()}`);
      if (byCode && byCode !== `error.${code.toLowerCase()}`) return byCode;
      const unknown = i18n.t('error.unknown');
      if (unknown && unknown !== 'error.unknown') return unknown;
    }
    return fallback || code;
  }

  function reportError(
    err: unknown,
    opts?: ReportErrorOptions,
  ): { code: string; message: string; silenced: boolean } {
    const info = narrowError(err);
    const silenced = !!opts?.silentCodes?.includes(info.code);

    if (silenced) {
      // Treat as intentional swallow but keep the breadcrumb.
      console.debug('[panel:error:silent]', info.code, info.original);
      return { code: info.code, message: info.message, silenced: true };
    }

    const label = resolveLabel(opts, info.code, info.message);

    // Group log: code as the headline, then stack + raw object inside.
    try {
      console.groupCollapsed(`[panel:error] ${info.code}: ${label}`);
      if (info.stack) console.error(info.stack);
      console.error('[panel:error:object]', info.original);
      console.groupEnd();
    } catch {
      // Some test environments (jsdom) lack groupCollapsed — log flat.
      console.error('[panel:error]', info.code, info.original);
    }

    if (!opts?.noToast && message) {
      message.error(label);
    }

    return { code: info.code, message: info.message, silenced: false };
  }

  async function withErrorToast<T>(
    promise: Promise<T>,
    opts?: WithErrorToastOptions,
  ): Promise<T | undefined> {
    try {
      return await promise;
    } catch (err) {
      reportError(err, opts);
      return undefined;
    }
  }

  function silenceError(err: unknown): void {
    console.debug('[panel:error:silent]', err);
  }

  return { reportError, withErrorToast, silenceError };
}
