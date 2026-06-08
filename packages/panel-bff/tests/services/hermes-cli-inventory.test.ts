import { describe, expect, it, afterEach } from 'vitest';
import {
  getCliCommandHelp,
  getCliCommandInventory,
  isSafeCliCommand,
  parseHermesHelpCommands,
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
});

describe('getCliCommandInventory', () => {
  it('returns empty commands with an error code when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-cli-inventory-test';
    const inventory = await getCliCommandInventory();
    expect(inventory.source).toBe('hermes --help');
    expect(inventory.commands).toEqual([]);
    expect(inventory.error).toBe('HERMES_CLI_NOT_FOUND');
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
