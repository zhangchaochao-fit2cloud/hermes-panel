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
