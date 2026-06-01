function readMeta(name: string): string {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content') ?? '';
}

interface DesktopBffInfo {
  port?: number | null;
  token?: string | null;
  error?: string | null;
}

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

let desktopBffInfoPromise: Promise<DesktopBffInfo | null> | null = null;

function readTauriInvoke(): TauriInvoke | null {
  const w = window as typeof window & {
    __TAURI__?: { core?: { invoke?: TauriInvoke } };
    __TAURI_INTERNALS__?: { invoke?: TauriInvoke };
  };
  return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null;
}

async function readDesktopBffInfo(): Promise<DesktopBffInfo | null> {
  if (!desktopBffInfoPromise) {
    desktopBffInfoPromise = (async () => {
      const invoke = readTauriInvoke();
      if (!invoke) return null;
      try {
        const info = await invoke<DesktopBffInfo>('bff_info');
        if (info?.error) {
          console.error('[bff] desktop launcher error:', info.error);
        }
        return info;
      } catch (err) {
        console.error('[bff] failed to read desktop launcher info', err);
        return null;
      }
    })();
  }
  return desktopBffInfoPromise;
}

const SESSION_TOKEN_KEY = 'hermes-panel.session';

/** The logged-in account session token, if any (written by stores/auth.ts). */
export function getSessionToken(): string {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function getPanelToken(): string {
  const v = readMeta('panel-token');
  // In Vite dev the meta still has the placeholder; we fall back to env
  if (!v || v === '__PANEL_TOKEN__') {
    return (import.meta.env.VITE_PANEL_TOKEN as string) ?? '';
  }
  return v;
}

export function getBffBase(): string {
  return readMeta('panel-bff-base') || 'http://127.0.0.1:5667';
}

export async function getPanelTokenAsync(): Promise<string> {
  // An account session token (logged-in user) takes precedence over the
  // boot/desktop token — it carries the user identity the BFF needs.
  const session = getSessionToken();
  if (session) return session;
  const desktop = await readDesktopBffInfo();
  if (desktop?.token) return desktop.token;
  return getPanelToken();
}

export async function getBffBaseAsync(): Promise<string> {
  const desktop = await readDesktopBffInfo();
  if (typeof desktop?.port === 'number') return `http://127.0.0.1:${desktop.port}`;
  return getBffBase();
}

export function getHermesApiBase(): string {
  const meta = readMeta('hermes-api-base');
  if (meta && meta !== '__HERMES_API_BASE__') return meta;
  return (import.meta.env.VITE_HERMES_API_BASE as string) || 'http://127.0.0.1:8642';
}
