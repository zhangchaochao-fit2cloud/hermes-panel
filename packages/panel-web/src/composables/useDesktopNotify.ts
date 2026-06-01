const KEY = 'panel.desktopNotify';

let granted: boolean | null = null;

export function useDesktopNotify() {
  async function request(): Promise<boolean> {
    if (granted !== null) return granted;
    if (!('Notification' in window)) { granted = false; return false; }
    if (Notification.permission === 'granted') { granted = true; return true; }
    if (Notification.permission === 'denied') { granted = false; return false; }
    const result = await Notification.requestPermission();
    granted = result === 'granted';
    if (granted) localStorage.setItem(KEY, '1');
    return granted;
  }

  function notify(title: string, options?: NotificationOptions & { onClick?: () => void }): void {
    if (!granted || !('Notification' in window)) return;
    const { onClick, ...rest } = options ?? {};
    const n = new Notification(title, { icon: '/favicon.ico', ...rest });
    if (onClick) {
      n.onclick = () => { onClick(); n.close(); };
    }
  }

  return { request, notify, granted };
}
