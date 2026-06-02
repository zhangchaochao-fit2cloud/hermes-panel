/**
 * Proactive Agent — scans the development environment and generates suggestions.
 * Unlike reactive chat, this agent proactively identifies issues and opportunities.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../lib/logger.js';

const execAsync = promisify(execFile);

export interface ProactiveSuggestion {
  id: string;
  type: 'missing-test' | 'stale-pr' | 'security-update' | 'unused-code' | 'large-file';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  suggestedAction?: string;
  source: string;
  createdAt: number;
}

/**
 * Scan recent git log for commits without corresponding test changes.
 */
async function scanMissingTests(cwd?: string): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  try {
    const { stdout } = await execAsync('git', ['log', '--oneline', '--since=7.days', '--name-only'], { cwd, timeout: 10000 });
    const commits = stdout.split('\n\n').filter(Boolean);
    
    for (const commit of commits.slice(0, 10)) {
      const lines = commit.split('\n');
      const title = lines[0] ?? '';
      const files = lines.slice(1).filter(f => f.trim());
      
      const hasSourceChanges = files.some(f => /\.(ts|js|vue|py|go|rs)$/.test(f) && !f.includes('test') && !f.includes('spec'));
      const hasTestChanges = files.some(f => /test|spec/i.test(f));
      
      if (hasSourceChanges && !hasTestChanges && !title.includes('chore') && !title.includes('docs')) {
        suggestions.push({
          id: `missing-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'missing-test',
          title: `Commit may lack tests: ${title.slice(0, 60)}`,
          description: `${files.filter(f => !f.includes('test')).length} source files changed without test updates`,
          severity: 'warning',
          actionable: true,
          suggestedAction: `Write tests for the changes in: ${files.slice(0, 3).join(', ')}`,
          source: 'git-log',
          createdAt: Date.now(),
        });
      }
    }
  } catch (err) {
    logger.debug({ err }, 'proactive: git scan failed (not in git repo?)');
  }
  return suggestions.slice(0, 5);
}

/**
 * Check for outdated dependencies (npm/pnpm).
 */
async function scanOutdatedDeps(cwd?: string): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  try {
    const { stdout } = await execAsync('pnpm', ['outdated', '--format=json'], { cwd, timeout: 15000 });
    const outdated = JSON.parse(stdout || '{}');
    const entries = Object.entries(outdated);
    if (entries.length > 5) {
      suggestions.push({
        id: `outdated-deps-${Date.now()}`,
        type: 'security-update',
        title: `${entries.length} outdated dependencies detected`,
        description: `Consider updating: ${entries.slice(0, 5).map(([name]) => name).join(', ')}${entries.length > 5 ? '...' : ''}`,
        severity: entries.length > 20 ? 'warning' : 'info',
        actionable: true,
        suggestedAction: 'Run `pnpm update` to update safe patches, review breaking changes manually',
        source: 'pnpm-outdated',
        createdAt: Date.now(),
      });
    }
  } catch {
    // pnpm outdated not available or no outdated packages — fine
  }
  return suggestions;
}

/**
 * Main scan: run all proactive checks.
 */
export async function runProactiveScan(cwd?: string): Promise<ProactiveSuggestion[]> {
  const [testSuggestions, depSuggestions] = await Promise.allSettled([
    scanMissingTests(cwd),
    scanOutdatedDeps(cwd),
  ]);

  const results: ProactiveSuggestion[] = [];
  if (testSuggestions.status === 'fulfilled') results.push(...testSuggestions.value);
  if (depSuggestions.status === 'fulfilled') results.push(...depSuggestions.value);
  
  return results.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
