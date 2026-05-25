// Code template generators for the Developer page CodeGen tab.
// Given a saved request from the Playground history, produce snippets in five flavors.

export interface RequestSnapshot {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export type CodeLang = 'curl' | 'fetch' | 'python' | 'go' | 'sdk';

interface LangMeta { id: CodeLang; label: string; ext: string }

export const SUPPORTED_LANGS: ReadonlyArray<LangMeta> = [
  { id: 'curl', label: 'cURL', ext: 'sh' },
  { id: 'fetch', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'sdk', label: 'TypeScript SDK', ext: 'ts' },
] as const;

function shellEscape(s: string): string {
  // Single-quote escape for POSIX shells.
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function indent(s: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return s.split('\n').map(line => (line ? pad + line : line)).join('\n');
}

function prettyBody(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const trimmed = body.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

function fullUrl(url: string): string {
  // The Playground URL is always BFF-relative. For display we keep it relative
  // but for runnable curl/fetch we prepend a placeholder base.
  if (/^https?:\/\//i.test(url)) return url;
  return `\${BFF_BASE}${url}`;
}

export function genCurl(req: RequestSnapshot): string {
  const lines: string[] = [];
  lines.push(`BFF_BASE="http://127.0.0.1:5667"`);
  lines.push(`PANEL_TOKEN="<your-panel-token>"`);
  lines.push('');
  lines.push(`curl -X ${req.method} "${fullUrl(req.url)}" \\`);
  lines.push(`  -H "X-Panel-Token: $PANEL_TOKEN" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === 'content-type' || k.toLowerCase() === 'x-panel-token') continue;
    lines.push(`  -H ${shellEscape(`${k}: ${v}`)} \\`);
  }
  const body = prettyBody(req.body);
  if (body && req.method !== 'GET') {
    lines.push(`  -d ${shellEscape(body)}`);
  } else {
    // Remove trailing backslash on last header line.
    const last = lines.pop();
    if (last) lines.push(last.replace(/ \\$/, ''));
  }
  return lines.join('\n');
}

export function genFetch(req: RequestSnapshot): string {
  const body = prettyBody(req.body);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Panel-Token': '<your-panel-token>',
    ...req.headers,
  };
  const init: string[] = [];
  init.push(`method: '${req.method}'`);
  init.push(`headers: ${JSON.stringify(headers, null, 2)}`);
  if (body && req.method !== 'GET') init.push(`body: JSON.stringify(${body})`);
  return [
    `const BFF_BASE = 'http://127.0.0.1:5667';`,
    ``,
    `const res = await fetch(\`\${BFF_BASE}${req.url}\`, {`,
    indent(init.join(',\n')),
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].join('\n');
}

export function genPython(req: RequestSnapshot): string {
  const body = prettyBody(req.body);
  const lines: string[] = [];
  lines.push(`import requests`);
  lines.push(``);
  lines.push(`BFF_BASE = "http://127.0.0.1:5667"`);
  lines.push(`PANEL_TOKEN = "<your-panel-token>"`);
  lines.push(``);
  lines.push(`headers = {`);
  lines.push(`    "X-Panel-Token": PANEL_TOKEN,`);
  lines.push(`    "Content-Type": "application/json",`);
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === 'content-type' || k.toLowerCase() === 'x-panel-token') continue;
    lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines.push(`}`);
  if (body && req.method !== 'GET') {
    lines.push(``);
    lines.push(`payload = ${body}`);
    lines.push(``);
    lines.push(`r = requests.${req.method.toLowerCase()}(`);
    lines.push(`    f"{BFF_BASE}${req.url}",`);
    lines.push(`    headers=headers,`);
    lines.push(`    json=payload,`);
    lines.push(`)`);
  } else {
    lines.push(``);
    lines.push(`r = requests.${req.method.toLowerCase()}(`);
    lines.push(`    f"{BFF_BASE}${req.url}",`);
    lines.push(`    headers=headers,`);
    lines.push(`)`);
  }
  lines.push(`print(r.status_code, r.json())`);
  return lines.join('\n');
}

export function genGo(req: RequestSnapshot): string {
  const body = prettyBody(req.body);
  const hasBody = !!body && req.method !== 'GET';
  const lines: string[] = [];
  lines.push(`package main`);
  lines.push(``);
  lines.push(`import (`);
  lines.push(`\t"bytes"`);
  lines.push(`\t"fmt"`);
  lines.push(`\t"io"`);
  lines.push(`\t"net/http"`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`func main() {`);
  lines.push(`\tconst bffBase = "http://127.0.0.1:5667"`);
  lines.push(`\tconst panelToken = "<your-panel-token>"`);
  lines.push(``);
  if (hasBody) {
    lines.push(`\tpayload := []byte(\`${body}\`)`);
    lines.push(`\treq, _ := http.NewRequest("${req.method}", bffBase+"${req.url}", bytes.NewReader(payload))`);
  } else {
    lines.push(`\treq, _ := http.NewRequest("${req.method}", bffBase+"${req.url}", nil)`);
  }
  lines.push(`\treq.Header.Set("X-Panel-Token", panelToken)`);
  lines.push(`\treq.Header.Set("Content-Type", "application/json")`);
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === 'content-type' || k.toLowerCase() === 'x-panel-token') continue;
    lines.push(`\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})`);
  }
  lines.push(``);
  lines.push(`\tres, err := http.DefaultClient.Do(req)`);
  lines.push(`\tif err != nil { panic(err) }`);
  lines.push(`\tdefer res.Body.Close()`);
  lines.push(`\tbody, _ := io.ReadAll(res.Body)`);
  lines.push(`\tfmt.Println(res.StatusCode, string(body))`);
  lines.push(`}`);
  return lines.join('\n');
}

export function genSdk(req: RequestSnapshot): string {
  // Pseudo-SDK shape, matches the BFF client style used in panel-web.
  const body = prettyBody(req.body);
  const isRun = /\/v1\/runs/.test(req.url) && req.method === 'POST';
  if (isRun && body) {
    return [
      `import { HermesClient } from '@hermes-panel/sdk';`,
      ``,
      `const client = new HermesClient({`,
      `  bffBase: 'http://127.0.0.1:5667',`,
      `  panelToken: '<your-panel-token>',`,
      `});`,
      ``,
      `const stream = await client.runs.create(${body});`,
      ``,
      `for await (const event of stream) {`,
      `  console.log(event);`,
      `}`,
    ].join('\n');
  }
  return [
    `import { HermesClient } from '@hermes-panel/sdk';`,
    ``,
    `const client = new HermesClient({`,
    `  bffBase: 'http://127.0.0.1:5667',`,
    `  panelToken: '<your-panel-token>',`,
    `});`,
    ``,
    `const res = await client.request({`,
    `  method: '${req.method}',`,
    `  path: '${req.url}',`,
    body && req.method !== 'GET' ? `  body: ${body},` : '',
    `});`,
    `console.log(res);`,
  ].filter(line => line !== '').join('\n');
}

export function genCode(lang: CodeLang, req: RequestSnapshot): string {
  switch (lang) {
    case 'curl': return genCurl(req);
    case 'fetch': return genFetch(req);
    case 'python': return genPython(req);
    case 'go': return genGo(req);
    case 'sdk': return genSdk(req);
  }
}
