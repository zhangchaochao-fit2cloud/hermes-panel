export default {
  app: {
    name: 'Hermes Panel',
    tagline: 'Beautiful control panel for Hermes Agent',
  },
  nav: {
    chat: 'Chat',
  },
  chat: {
    empty: {
      title: 'Start a conversation',
      subtitle: 'Ask anything — {model} will help.',
    },
    composer: {
      placeholder: 'Type a message, Shift+Enter for newline...',
      send: 'Send',
      stop: 'Stop',
    },
    toolCall: {
      pending: 'Preparing',
      running: 'Running',
      done: 'Done',
      error: 'Failed',
    },
  },
  status: {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting... (attempt {n}/5)',
  },
  error: {
    hermes_not_found: 'Hermes not found',
    hermes_api_timeout: 'Hermes did not respond',
    network_offline: 'Network is offline',
    unknown: 'Unknown error',
  },
} as const;
