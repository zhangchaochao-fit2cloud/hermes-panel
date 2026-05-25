export const PORTS = {
  HERMES_API: 8642,
  PANEL_WEB: 5666,
  PANEL_BFF: 5667,
  FAKE_HERMES: 18642,
} as const;

export const HEADERS = {
  PANEL_TOKEN: 'X-Panel-Token',
  HERMES_SESSION: 'X-Hermes-Session-Id',
} as const;

export const ENV = {
  HERMES_HOME: 'HERMES_HOME',
  PANEL_HOME: 'PANEL_HOME',
  PANEL_TOKEN: 'PANEL_TOKEN',
  HERMES_API_KEY: 'HERMES_API_KEY',
  HERMES_API_BASE: 'HERMES_API_BASE',
  BFF_PORT: 'BFF_PORT',
} as const;
