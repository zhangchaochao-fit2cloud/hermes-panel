export interface HealthStatus {
  hermes: {
    running: boolean;
    version: string | null;
    apiBase: string;
    error?: string;
  };
  bff: {
    running: boolean;
    version: string;
    uptimeSec: number;
  };
  panel: {
    version: string;
  };
}

export type CliCommandCoverage = 'ready' | 'partial' | 'missing';
export type CliCommandGroup = 'core' | 'config' | 'extensions' | 'ops' | 'advanced';

export interface CliCommandInventoryItem {
  command: string;
  description: string;
  group: CliCommandGroup;
  coverage: CliCommandCoverage;
  route?: string;
  example: string;
}

export interface CliCommandInventoryResponse {
  source: 'hermes --help';
  generatedAt: number;
  commands: CliCommandInventoryItem[];
  error?: string;
}
