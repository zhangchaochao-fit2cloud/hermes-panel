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
export type CliCommandGroupSummary = Record<CliCommandGroup, number>;
export type CliCommandRisk = 'standard' | 'support' | 'guarded' | 'destructive' | 'protocol' | 'migration';

export interface CliCommandInventoryItem {
  command: string;
  description: string;
  group: CliCommandGroup;
  coverage: CliCommandCoverage;
  route?: string;
  example: string;
  risk?: CliCommandRisk;
  fallback?: string;
}

export interface CliCommandInventorySummary {
  all: number;
  ready: number;
  partial: number;
  missing: number;
  groups: CliCommandGroupSummary;
}

export interface CliCommandInventoryResponse {
  source: 'hermes --help';
  generatedAt: number;
  commands: CliCommandInventoryItem[];
  summary?: CliCommandInventorySummary;
  error?: string;
}

export interface CliCommandHelpResponse {
  command: string;
  source: string;
  generatedAt: number;
  stdout: string;
  stderr?: string;
  error?: string;
}
