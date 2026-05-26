import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

export interface WebhookSubscription {
  name: string;
  events?: string;
  description?: string;
  skills?: string;
  deliver?: string;
  deliverChatId?: string;
  prompt?: string;
  /** Hermes hides the full HMAC secret. We surface whatever the CLI prints. */
  secretHint?: string;
}

export interface ListResult {
  subscriptions: WebhookSubscription[];
  /** True when the gateway has webhook platform disabled. */
  disabled?: boolean;
  /** Raw stdout if parsing fell through (for the UI to render as a fallback). */
  raw?: string;
  error?: string;
}

/**
 * Parse `hermes webhook list` output.
 *
 * Hermes prints either:
 *   - The setup instructions when the platform is disabled (stdout starts
 *     with "Webhook platform is not enabled.").
 *   - An empty message ("No webhook subscriptions") for an enabled-but-empty
 *     install.
 *   - A block per subscription. The block shape is not formally specified;
 *     observed shape is `name` followed by indented `key: value` lines, so we
 *     parse defensively in the same style as `listCron()`.
 */
export async function listWebhooks(): Promise<ListResult> {
  try {
    const { stdout } = await runHermesCli(['webhook', 'list'], { timeoutMs: 8_000 });

    if (/webhook platform is not enabled/i.test(stdout)) {
      return { subscriptions: [], disabled: true, raw: stdout };
    }
    if (/no webhook subscriptions|no subscriptions/i.test(stdout) && !/^\s*\S+\s*$/m.test(stdout.replace(/no .*/i, ''))) {
      return { subscriptions: [] };
    }

    const subs: WebhookSubscription[] = [];
    let current: WebhookSubscription | null = null;
    let inMeta = false;

    for (const raw of stdout.split('\n')) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        // Blank line ends a record
        if (current) {
          subs.push(current);
          current = null;
          inMeta = false;
        }
        continue;
      }
      // Skip header / divider lines
      if (/^[\s─━=─-]+$/.test(line)) continue;

      // A non-indented (or 2-space-indented) line that doesn't look like a
      // "key: value" starts a new record. Examples seen in similar commands:
      //   "  my-route"
      //   "  my-route [enabled]"
      const head = line.match(/^\s{0,2}(\S[^:]*?)(?:\s+\[(\S+)\])?\s*$/);
      const kv = line.match(/^\s{2,}(\S[^:]*):\s*(.*)$/);
      if (kv && current) {
        const key = kv[1].trim().toLowerCase();
        const val = kv[2].trim();
        switch (key) {
          case 'name': current.name = val || current.name; break;
          case 'events': current.events = val; break;
          case 'description': current.description = val; break;
          case 'skills': current.skills = val; break;
          case 'deliver':
          case 'delivery': current.deliver = val; break;
          case 'deliver chat id':
          case 'chat id': current.deliverChatId = val; break;
          case 'prompt': current.prompt = val; break;
          case 'secret':
          case 'hmac':
          case 'hmac secret': current.secretHint = val; break;
        }
        continue;
      }
      if (head && !kv) {
        if (current) subs.push(current);
        current = { name: head[1].trim() };
        inMeta = true;
        continue;
      }
      if (!current && !inMeta) {
        // Leading prose we don't understand — keep scanning.
        continue;
      }
    }
    if (current) subs.push(current);

    if (subs.length === 0 && stdout.trim().length > 0) {
      // Couldn't parse — return raw so UI shows it untouched.
      return { subscriptions: [], raw: stdout };
    }
    return { subscriptions: subs };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes webhook list failed');
    return { subscriptions: [], error: code };
  }
}

export interface AddWebhookInput {
  name: string;
  prompt?: string;
  events?: string;
  description?: string;
  skills?: string;
  deliver?: string;
  deliverChatId?: string;
  secret?: string;
}

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

/**
 * Create a new webhook subscription via `hermes webhook subscribe <name> [flags]`.
 */
export async function addWebhook(input: AddWebhookInput): Promise<{ ok: boolean; error?: string; stderr?: string }> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: 'NAME_REQUIRED' };
  if (!NAME_RE.test(name)) return { ok: false, error: 'INVALID_NAME' };

  const args: string[] = ['webhook', 'subscribe'];
  if (input.prompt && input.prompt.trim()) args.push('--prompt', input.prompt);
  if (input.events && input.events.trim()) args.push('--events', input.events.trim());
  if (input.description && input.description.trim()) args.push('--description', input.description);
  if (input.skills && input.skills.trim()) args.push('--skills', input.skills.trim());
  if (input.deliver && input.deliver.trim()) args.push('--deliver', input.deliver.trim());
  if (input.deliverChatId && input.deliverChatId.trim()) args.push('--deliver-chat-id', input.deliverChatId.trim());
  if (input.secret && input.secret.trim()) args.push('--secret', input.secret);
  args.push(name);

  try {
    await runHermesCli(args, { timeoutMs: 15_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const stderr = ((err.detail as { stderr?: string } | undefined)?.stderr ?? '').toString();
      return { ok: false, error: err.code, stderr };
    }
    throw err;
  }
}

export async function removeWebhook(name: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = name?.trim();
  if (!trimmed) return { ok: false, error: 'NAME_REQUIRED' };
  try {
    await runHermesCli(['webhook', 'remove', trimmed], { timeoutMs: 10_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}

export interface TestWebhookInput {
  name: string;
  payload?: string;
}

export interface TestWebhookResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

/**
 * Send a test POST via `hermes webhook test <name> [--payload <json>]`.
 *
 * The captured stdout is returned verbatim so the UI can display whatever
 * Hermes echoes (status code, response body, parsed JSON, etc).
 */
export async function testWebhook(input: TestWebhookInput): Promise<TestWebhookResult> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: 'NAME_REQUIRED' };
  if (input.payload && input.payload.trim()) {
    // Validate JSON so we surface a useful 400 instead of letting Hermes choke.
    try { JSON.parse(input.payload); }
    catch { return { ok: false, error: 'INVALID_PAYLOAD' }; }
  }

  const args: string[] = ['webhook', 'test'];
  if (input.payload && input.payload.trim()) args.push('--payload', input.payload);
  args.push(name);

  try {
    const { stdout, stderr } = await runHermesCli(args, { timeoutMs: 20_000 });
    return { ok: true, stdout, stderr };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const stderr = ((err.detail as { stderr?: string } | undefined)?.stderr ?? '').toString();
      return { ok: false, error: err.code, stderr };
    }
    throw err;
  }
}
