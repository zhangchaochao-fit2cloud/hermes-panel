export default {
  app: {
    name: 'Hermes Panel',
    tagline: '为 Hermes Agent 设计的精美控制面板',
  },
  nav: {
    chat: '对话',
  },
  chat: {
    empty: {
      title: '开始对话',
      subtitle: '随便问点什么，{model} 会帮你解决',
    },
    composer: {
      placeholder: '输入消息，Shift+Enter 换行...',
      send: '发送',
      stop: '停止',
    },
    toolCall: {
      pending: '准备调用',
      running: '正在执行',
      done: '已完成',
      error: '调用失败',
    },
  },
  status: {
    connecting: '正在连接...',
    connected: '已连接',
    disconnected: '已断开',
    reconnecting: '正在重连... (尝试 {n}/5)',
  },
  error: {
    hermes_not_found: '找不到 Hermes',
    hermes_api_timeout: 'Hermes 没有响应',
    network_offline: '网络已断开',
    unknown: '未知错误',
  },
} as const;
