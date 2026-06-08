import type {
  CliCommandHelpResponse,
  CliCommandCoverage,
  CliCommandGroup,
  CliCommandGroupSummary,
  CliCommandInventoryItem,
  CliCommandInventoryResponse,
  CliCommandInventorySummary,
} from '@hermes-panel/shared';
import { logger } from '../lib/logger.js';
import { HermesCliError, runHermesCli } from './hermes-cli.js';

interface CoverageMeta {
  group: CliCommandGroup;
  coverage: CliCommandCoverage;
  route?: string;
  example: string;
}

const COVERAGE: Record<string, CoverageMeta> = {
  chat: { group: 'core', coverage: 'ready', route: '/chat', example: 'hermes chat -q "Summarize this repo"' },
  model: { group: 'config', coverage: 'ready', route: '/settings#providers', example: 'hermes model' },
  gateway: { group: 'ops', coverage: 'ready', route: '/settings#system-health', example: 'hermes gateway run' },
  setup: { group: 'config', coverage: 'partial', route: '/settings#system-health', example: 'hermes setup' },
  whatsapp: { group: 'ops', coverage: 'partial', route: '/channels', example: 'hermes whatsapp' },
  login: { group: 'config', coverage: 'partial', route: '/settings#providers', example: 'hermes login openai' },
  logout: { group: 'config', coverage: 'partial', route: '/settings#providers', example: 'hermes logout openai' },
  auth: { group: 'config', coverage: 'ready', route: '/settings#providers', example: 'hermes auth list' },
  status: { group: 'ops', coverage: 'ready', route: '/settings#system-health', example: 'hermes status' },
  cron: { group: 'core', coverage: 'ready', route: '/cron', example: 'hermes cron list' },
  webhook: { group: 'ops', coverage: 'ready', route: '/developer#webhook', example: 'hermes webhook list' },
  doctor: { group: 'ops', coverage: 'ready', route: '/developer#doctor', example: 'hermes doctor' },
  dump: { group: 'ops', coverage: 'partial', route: '/developer#doctor', example: 'hermes dump' },
  debug: { group: 'ops', coverage: 'partial', route: '/developer#logs', example: 'hermes debug share' },
  backup: { group: 'ops', coverage: 'ready', route: '/settings#backup', example: 'hermes backup' },
  import: { group: 'ops', coverage: 'ready', route: '/settings#backup', example: 'hermes import backup.zip' },
  config: { group: 'config', coverage: 'partial', route: '/settings', example: 'hermes config set model gpt-4' },
  pairing: { group: 'ops', coverage: 'partial', route: '/channels', example: 'hermes pairing list' },
  skills: { group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes skills list' },
  plugins: { group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes plugins list' },
  memory: { group: 'core', coverage: 'ready', route: '/memory', example: 'hermes memory' },
  tools: { group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes tools list' },
  mcp: { group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes mcp list' },
  sessions: { group: 'core', coverage: 'ready', route: '/sessions', example: 'hermes sessions list' },
  insights: { group: 'advanced', coverage: 'partial', route: '/cost', example: 'hermes insights' },
  claw: { group: 'advanced', coverage: 'missing', example: 'hermes claw --help' },
  version: { group: 'ops', coverage: 'ready', route: '/settings#about', example: 'hermes version' },
  update: { group: 'ops', coverage: 'missing', example: 'hermes update' },
  uninstall: { group: 'ops', coverage: 'missing', example: 'hermes uninstall' },
  acp: { group: 'advanced', coverage: 'missing', example: 'hermes acp' },
  profile: { group: 'config', coverage: 'ready', route: '/workspaces', example: 'hermes profile list' },
  completion: { group: 'advanced', coverage: 'missing', example: 'hermes completion zsh' },
  logs: { group: 'ops', coverage: 'ready', route: '/developer#logs', example: 'hermes logs --since 1h' },
};

const DEFAULT_META: CoverageMeta = {
  group: 'advanced',
  coverage: 'missing',
  example: 'hermes <command> --help',
};

const CLI_COMMAND_GROUPS: CliCommandGroup[] = ['core', 'config', 'extensions', 'ops', 'advanced'];
const COMMAND_SECTION_HEADER = /^\s*(commands|available commands|subcommands):\s*$/i;
const HELP_SECTION_BOUNDARY = /^\s*(options|flags|global options|examples|arguments):/i;
const COMMAND_LINE_PATTERNS = [
  /^\s{2,}([a-z][\w-]*)\s{2,}(.+)$/,
  /^\s{2,}([a-z][\w-]*)\s+-\s+(.+)$/,
  /^\s{2,}([a-z][\w-]*):\s+(.+)$/,
];

function parseCommandHelpLine(line: string): Pick<CliCommandInventoryItem, 'command' | 'description'> | null {
  for (const pattern of COMMAND_LINE_PATTERNS) {
    const match = line.match(pattern);
    if (match) return { command: match[1], description: match[2].trim() };
  }
  return null;
}

export function parseHermesHelpCommands(stdout: string): Pick<CliCommandInventoryItem, 'command' | 'description'>[] {
  const commands: Pick<CliCommandInventoryItem, 'command' | 'description'>[] = [];
  const seen = new Set<string>();
  const lines = stdout.split(/\r?\n/);
  let inCommandSection = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (/^\s*\{[^}]+\}\s*$/.test(trimmed)) {
      inCommandSection = true;
      continue;
    }
    if (COMMAND_SECTION_HEADER.test(trimmed)) {
      inCommandSection = true;
      continue;
    }
    if (!inCommandSection) continue;
    if (HELP_SECTION_BOUNDARY.test(trimmed)) break;

    const parsed = parseCommandHelpLine(trimmed);
    if (!parsed) continue;
    const command = parsed.command;
    if (seen.has(command)) continue;
    seen.add(command);
    commands.push(parsed);
  }

  return commands;
}

export function summarizeCliCommandInventory(commands: CliCommandInventoryItem[]): CliCommandInventorySummary {
  const groups = CLI_COMMAND_GROUPS.reduce<CliCommandGroupSummary>((acc, group) => {
    acc[group] = 0;
    return acc;
  }, {} as CliCommandGroupSummary);
  for (const cmd of commands) {
    groups[cmd.group] += 1;
  }

  return {
    all: commands.length,
    ready: commands.filter(cmd => cmd.coverage === 'ready').length,
    partial: commands.filter(cmd => cmd.coverage === 'partial').length,
    missing: commands.filter(cmd => cmd.coverage === 'missing').length,
    groups,
  };
}

export async function getCliCommandInventory(): Promise<CliCommandInventoryResponse> {
  try {
    const { stdout } = await runHermesCli(['--help'], { timeoutMs: 8_000 });
    const commands = parseHermesHelpCommands(stdout).map((cmd): CliCommandInventoryItem => {
      const meta = COVERAGE[cmd.command] ?? {
        ...DEFAULT_META,
        example: DEFAULT_META.example.replace('<command>', cmd.command),
      };
      return {
        ...cmd,
        ...meta,
      };
    });

    return {
      source: 'hermes --help',
      generatedAt: Date.now(),
      commands,
      summary: summarizeCliCommandInventory(commands),
    };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes cli inventory failed');
    return {
      source: 'hermes --help',
      generatedAt: Date.now(),
      commands: [],
      summary: summarizeCliCommandInventory([]),
      error: code,
    };
  }
}

export function isSafeCliCommand(command: string): boolean {
  return /^[a-z][\w-]{0,63}$/.test(command);
}

export async function getCliCommandHelp(command: string): Promise<CliCommandHelpResponse> {
  const generatedAt = Date.now();
  if (!isSafeCliCommand(command)) {
    return {
      command,
      source: `hermes ${command} --help`,
      generatedAt,
      stdout: '',
      error: 'BAD_COMMAND',
    };
  }

  try {
    const { stdout, stderr } = await runHermesCli([command, '--help'], { timeoutMs: 8_000 });
    return {
      command,
      source: `hermes ${command} --help`,
      generatedAt,
      stdout,
      ...(stderr ? { stderr } : {}),
    };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code, command }, 'hermes cli command help failed');
    return {
      command,
      source: `hermes ${command} --help`,
      generatedAt,
      stdout: '',
      error: code,
    };
  }
}
