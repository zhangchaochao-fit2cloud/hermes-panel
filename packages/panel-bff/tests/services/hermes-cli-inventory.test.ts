import { describe, expect, it, afterEach } from 'vitest';
import {
  getCliCommandInventory,
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
