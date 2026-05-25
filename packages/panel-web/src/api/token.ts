function readMeta(name: string): string {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content') ?? '';
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

export function getHermesApiBase(): string {
  return readMeta('hermes-api-base') || 'http://127.0.0.1:8642';
}
