import * as vscode from 'vscode';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface PanelConfig {
  bffUrl: string;
  token: string;
  openOnSend: boolean;
}

function getConfig(): PanelConfig {
  const c = vscode.workspace.getConfiguration('hermesPanel');
  return {
    bffUrl: c.get<string>('bffUrl') ?? 'http://127.0.0.1:5667',
    token: c.get<string>('token') ?? '',
    openOnSend: c.get<boolean>('openOnSend') ?? true,
  };
}

/**
 * Stage a draft chat prompt in the BFF. The Panel UI's Composer picks it up
 * on next mount via /api/draft (poll-based; spec §13.5 IDE integration).
 *
 * Until the BFF endpoint is wired, we fall back to opening the Panel with the
 * draft as a query param (URL: hermes-panel:// or http://127.0.0.1:5666/#/chat?draft=...).
 */
function workspaceCwd(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function stagePrompt(prompt: string, cfg: PanelConfig): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.token) headers['X-Panel-Token'] = cfg.token;
    const res = await fetch(`${cfg.bffUrl}/api/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, source: 'vscode', cwd: workspaceCwd(), stagedAt: Date.now() }),
    });
    return res.ok;
  } catch {
    // BFF unreachable — return false so caller falls back to URL open
    return false;
  }
}

async function openPanel(extraPath = ''): Promise<void> {
  // Try Tauri custom protocol first (will fail silently if Panel isn't installed)
  const tauriUri = vscode.Uri.parse(`hermes-panel://${extraPath || ''}`);
  await vscode.env.openExternal(tauriUri).then(undefined, () => {
    // Fallback: open the localhost web UI
    void vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:5666/#/${extraPath || 'chat'}`));
  });
}

async function sendContent(content: string, header: string): Promise<void> {
  if (!content.trim()) {
    void vscode.window.showWarningMessage('Nothing to send.');
    return;
  }
  const cfg = getConfig();
  const prompt = `${header}\n\n\`\`\`\n${content}\n\`\`\``;

  const staged = await stagePrompt(prompt, cfg);
  if (!staged) {
    // BFF not running or no /api/draft yet — copy to clipboard as a fallback
    await vscode.env.clipboard.writeText(prompt);
    void vscode.window.showInformationMessage(
      'Hermes Panel BFF unreachable. Prompt copied to clipboard; paste it into the chat.',
    );
  } else {
    void vscode.window.showInformationMessage('Sent to Hermes Panel.');
  }

  if (cfg.openOnSend) {
    await openPanel('chat');
  }
}

async function sendSelection(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor.');
    return;
  }
  const text = editor.document.getText(editor.selection);
  const file = vscode.workspace.asRelativePath(editor.document.uri);
  const lang = editor.document.languageId;
  await sendContent(text, `From ${file} (${lang}):`);
}

async function sendFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor.');
    return;
  }
  const text = editor.document.getText();
  const file = vscode.workspace.asRelativePath(editor.document.uri);
  await sendContent(text, `Full file ${file}:`);
}

async function sendDiff(): Promise<void> {
  const wf = vscode.workspace.workspaceFolders?.[0];
  if (!wf) {
    void vscode.window.showWarningMessage('No workspace folder.');
    return;
  }
  try {
    const { stdout } = await execAsync('git diff HEAD', { cwd: wf.uri.fsPath, maxBuffer: 1024 * 1024 });
    if (!stdout.trim()) {
      void vscode.window.showInformationMessage('Working tree clean — nothing to diff.');
      return;
    }
    await sendContent(stdout.slice(0, 200_000), 'Current git diff:');
  } catch (err) {
    void vscode.window.showErrorMessage(`Failed to run git diff: ${(err as Error).message}`);
  }
}

async function newChat(): Promise<void> {
  await openPanel('chat');
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('hermesPanel.sendSelection', sendSelection),
    vscode.commands.registerCommand('hermesPanel.sendFile', sendFile),
    vscode.commands.registerCommand('hermesPanel.sendDiff', sendDiff),
    vscode.commands.registerCommand('hermesPanel.newChat', newChat),
    vscode.commands.registerCommand('hermesPanel.openPanel', () => openPanel('')),
  );
}

export function deactivate(): void {/* noop */}
