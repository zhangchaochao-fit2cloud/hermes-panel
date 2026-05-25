import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export function getHermesHome(): string {
  return process.env.HERMES_HOME ?? join(homedir(), '.hermes');
}

export function getPanelHome(): string {
  return process.env.PANEL_HOME ?? join(homedir(), '.hermes-panel');
}

export function hermesHomeExists(): boolean {
  return existsSync(getHermesHome());
}
