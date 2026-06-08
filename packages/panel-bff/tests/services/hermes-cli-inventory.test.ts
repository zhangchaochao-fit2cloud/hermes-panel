import { describe, expect, it, afterEach } from 'vitest';
import {
  getCliCommandHelp,
  getCliCommandInventory,
  getCliCompletionScript,
  isSafeCliCommand,
  parseHermesHelpCommands,
  summarizeCliCommandInventory,
} from '../../src/services/hermes-cli-inventory.js';

const HELP = `usage: hermes [-h] {chat,model,gateway,doctor,logs} ...

positional arguments:
  {chat,model,gateway,doctor,logs}
                        Command to run
    chat                Interactive chat with the agent
    model               Select default model and provider
    gateway             Messaging gateway management
    doctor              Check configuration and dependencies
    logs                View and filter Hermes log files

options:
  -h, --help            show this help message and exit
`;

const COMMANDS_HELP = `Hermes Agent

Commands:
  chat        Interactive chat with the agent
  model       Select default model and provider
  mcp-server  Run an MCP server
  chat        Duplicate command should be ignored

Flags:
  -h, --help  Show help
`;

const AVAILABLE_COMMANDS_HELP = `Hermes Agent

Available commands:
  backup      Back up the Hermes home directory
  import      Restore from a Hermes backup

Examples:
  hermes backup
`;

const SUBCOMMANDS_HELP = `Hermes Agent

Subcommands:
  skills      Manage skills
  plugins     Manage plugins

Arguments:
  command     Command to run
`;

const MIXED_SEPARATOR_HELP = `Hermes Agent

Commands:
  update - Update Hermes Agent
  completion: Print shell completion scripts
  logs        View and filter Hermes log files

Options:
  -h, --help  Show help
`;

const TAB_SEPARATOR_HELP = `Hermes Agent

Commands:
  status\tShow component status
  doctor\tCheck configuration and dependencies

Options:
  -h, --help  Show help
`;

const WRAPPED_DESCRIPTION_HELP = `Hermes Agent

Commands:
  debug       Upload logs and system information
              for support review
  dump        Dump support/debug summaries

Options:
  -h, --help  Show help
`;

const GLOBAL_FLAGS_HELP = `Hermes Agent

Commands:
  status      Show component status
  logs        View and filter logs

Global Flags:
      --config string
                  config file path
`;

const HELP_TOPICS_HELP = `Hermes Agent

Commands:
  config      View and edit configuration
  mcp         Manage MCP servers

Additional Help Topics:
  hermes environment  Environment variables
                      used by Hermes
`;

const USAGE_ARGUMENT_HELP = `Hermes Agent

Commands:
  completion [shell]  Print shell completion scripts
  profile <name>      Switch active profile
  mcp {server}        Run an MCP server

Options:
  -h, --help  Show help
`;

afterEach(() => {
  delete process.env.HERMES_BIN;
});

describe('parseHermesHelpCommands', () => {
  it('extracts top-level command names and descriptions from hermes --help', () => {
    expect(parseHermesHelpCommands(HELP)).toEqual([
      { command: 'chat', description: 'Interactive chat with the agent' },
      { command: 'model', description: 'Select default model and provider' },
      { command: 'gateway', description: 'Messaging gateway management' },
      { command: 'doctor', description: 'Check configuration and dependencies' },
      { command: 'logs', description: 'View and filter Hermes log files' },
    ]);
  });

  it('extracts commands from a Commands section and stops at flags', () => {
    expect(parseHermesHelpCommands(COMMANDS_HELP)).toEqual([
      { command: 'chat', description: 'Interactive chat with the agent' },
      { command: 'model', description: 'Select default model and provider' },
      { command: 'mcp-server', description: 'Run an MCP server' },
    ]);
  });

  it('extracts commands from common help heading variants', () => {
    expect(parseHermesHelpCommands(AVAILABLE_COMMANDS_HELP)).toEqual([
      { command: 'backup', description: 'Back up the Hermes home directory' },
      { command: 'import', description: 'Restore from a Hermes backup' },
    ]);
    expect(parseHermesHelpCommands(SUBCOMMANDS_HELP)).toEqual([
      { command: 'skills', description: 'Manage skills' },
      { command: 'plugins', description: 'Manage plugins' },
    ]);
  });

  it('extracts command descriptions separated by dash or colon', () => {
    expect(parseHermesHelpCommands(MIXED_SEPARATOR_HELP)).toEqual([
      { command: 'update', description: 'Update Hermes Agent' },
      { command: 'completion', description: 'Print shell completion scripts' },
      { command: 'logs', description: 'View and filter Hermes log files' },
    ]);
  });

  it('extracts command descriptions separated by tabs', () => {
    expect(parseHermesHelpCommands(TAB_SEPARATOR_HELP)).toEqual([
      { command: 'status', description: 'Show component status' },
      { command: 'doctor', description: 'Check configuration and dependencies' },
    ]);
  });

  it('joins wrapped command descriptions', () => {
    expect(parseHermesHelpCommands(WRAPPED_DESCRIPTION_HELP)).toEqual([
      { command: 'debug', description: 'Upload logs and system information for support review' },
      { command: 'dump', description: 'Dump support/debug summaries' },
    ]);
  });

  it('stops before global flags without appending flag descriptions', () => {
    expect(parseHermesHelpCommands(GLOBAL_FLAGS_HELP)).toEqual([
      { command: 'status', description: 'Show component status' },
      { command: 'logs', description: 'View and filter logs' },
    ]);
  });

  it('stops before additional help topics', () => {
    expect(parseHermesHelpCommands(HELP_TOPICS_HELP)).toEqual([
      { command: 'config', description: 'View and edit configuration' },
      { command: 'mcp', description: 'Manage MCP servers' },
    ]);
  });

  it('extracts command names when help includes usage arguments', () => {
    expect(parseHermesHelpCommands(USAGE_ARGUMENT_HELP)).toEqual([
      { command: 'completion', description: 'Print shell completion scripts' },
      { command: 'profile', description: 'Switch active profile' },
      { command: 'mcp', description: 'Run an MCP server' },
    ]);
  });
});

describe('getCliCommandInventory', () => {
  it('returns empty commands with an error code when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-cli-inventory-test';
    const inventory = await getCliCommandInventory();
    expect(inventory.source).toBe('hermes --help');
    expect(inventory.commands).toEqual([]);
    expect(inventory.summary).toEqual({
      all: 0,
      ready: 0,
      partial: 0,
      missing: 0,
      groups: {
        core: 0,
        config: 0,
        extensions: 0,
        ops: 0,
        advanced: 0,
      },
    });
    expect(inventory.error).toBe('HERMES_CLI_NOT_FOUND');
  });
});

describe('summarizeCliCommandInventory', () => {
  it('counts commands by coverage and group', () => {
    expect(summarizeCliCommandInventory([
      {
        command: 'chat',
        description: 'Chat',
        group: 'core',
        coverage: 'ready',
        route: '/chat',
        example: 'hermes chat',
      },
      {
        command: 'config',
        description: 'Config',
        group: 'config',
        coverage: 'ready',
        route: '/settings',
        example: 'hermes config',
      },
      {
        command: 'update',
        description: 'Update',
        group: 'ops',
        coverage: 'missing',
        example: 'hermes update',
      },
    ])).toEqual({
      all: 3,
      ready: 2,
      partial: 0,
      missing: 1,
      groups: {
        core: 1,
        config: 1,
        extensions: 0,
        ops: 1,
        advanced: 0,
      },
    });
  });
});

describe('isSafeCliCommand', () => {
  it('accepts top-level hermes command names only', () => {
    expect(isSafeCliCommand('chat')).toBe(true);
    expect(isSafeCliCommand('mcp-server')).toBe(true);
    expect(isSafeCliCommand('profile_2')).toBe(true);

    expect(isSafeCliCommand('')).toBe(false);
    expect(isSafeCliCommand('../chat')).toBe(false);
    expect(isSafeCliCommand('chat --json')).toBe(false);
    expect(isSafeCliCommand('2chat')).toBe(false);
  });
});

describe('getCliCommandHelp', () => {
  it('does not execute unsafe command names', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const help = await getCliCommandHelp('chat --json');
    expect(help.source).toBe('hermes chat --json --help');
    expect(help.stdout).toBe('');
    expect(help.error).toBe('BAD_COMMAND');
  });

  it('returns stdout from hermes command help', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const help = await getCliCommandHelp('chat');
    expect(help.command).toBe('chat');
    expect(help.source).toBe('hermes chat --help');
    expect(help.stdout).toBe('chat --help\n');
    expect(help.error).toBeUndefined();
  });

  it('returns fallback error when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-command-help-test';
    const help = await getCliCommandHelp('chat');
    expect(help.command).toBe('chat');
    expect(help.stdout).toBe('');
    expect(help.error).toBe('HERMES_CLI_NOT_FOUND');
  });
});

describe('getCliCompletionScript', () => {
  it('runs whitelisted shell completion commands', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const completion = await getCliCompletionScript('zsh');
    expect(completion.shell).toBe('zsh');
    expect(completion.source).toBe('hermes completion zsh');
    expect(completion.stdout).toBe('completion zsh\n');
    expect(completion.error).toBeUndefined();
  });

  it('rejects unsupported shells before invoking hermes', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const completion = await getCliCompletionScript('zsh;rm');
    expect(completion.source).toBe('hermes completion zsh;rm');
    expect(completion.stdout).toBe('');
    expect(completion.error).toBe('BAD_SHELL');
  });

  it('returns fallback error when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-completion-test';
    const completion = await getCliCompletionScript('bash');
    expect(completion.shell).toBe('bash');
    expect(completion.stdout).toBe('');
    expect(completion.error).toBe('HERMES_CLI_NOT_FOUND');
  });
});
