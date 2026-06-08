import type { CliCommandInventoryItem } from '@hermes-panel/shared';

export interface CliParityReportItem extends CliCommandInventoryItem {
  displayDescription?: string;
}

export function selectCliParityBacklog(
  commands: CliCommandInventoryItem[],
  limit = 3,
): CliCommandInventoryItem[] {
  return commands
    .filter(cmd => cmd.coverage !== 'ready')
    .slice(0, limit);
}

export function formatCliParityReport(
  commands: CliParityReportItem[],
  generatedAt: Date = new Date(),
): string {
  const totals = {
    all: commands.length,
    ready: commands.filter(cmd => cmd.coverage === 'ready').length,
    partial: commands.filter(cmd => cmd.coverage === 'partial').length,
    missing: commands.filter(cmd => cmd.coverage === 'missing').length,
  };

  const lines = [
    '# Hermes CLI Parity Report',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    `Commands: ${totals.all} total, ${totals.ready} covered, ${totals.partial} partial, ${totals.missing} missing`,
    '',
  ];

  if (commands.length === 0) {
    lines.push('No commands match the current filters.');
    return lines.join('\n');
  }

  const backlog = commands.filter(cmd => cmd.coverage !== 'ready');
  if (backlog.length > 0) {
    lines.push('## Backlog');
    for (const cmd of backlog) {
      lines.push(`- [${cmd.coverage}] hermes ${cmd.command} -> ${cmd.route ?? 'No UI'} (${cmd.example})`);
    }
    lines.push('');
  }

  lines.push('## Commands');
  lines.push('| Command | Coverage | Group | UI | Example | Notes |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const cmd of commands) {
    lines.push([
      `hermes ${cmd.command}`,
      cmd.coverage,
      cmd.group,
      cmd.route ?? 'No UI',
      cmd.example,
      cmd.displayDescription ?? cmd.description,
    ].map(escapeMarkdownTableCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return lines.join('\n');
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
