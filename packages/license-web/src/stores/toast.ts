import { ref } from 'vue';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  content: string;
  duration?: number;
}

let _id = 0;
const queue = ref<ToastItem[]>([]);

export function useToast() {
  function push(type: ToastType, content: string, duration?: number) {
    queue.value = [...queue.value, { id: ++_id, type, content, duration }];
  }

  return {
    queue,
    success: (msg: string, duration?: number) => push('success', msg, duration),
    error: (msg: string, duration?: number) => push('error', msg, duration ?? 5000),
    warning: (msg: string, duration?: number) => push('warning', msg, duration),
    info: (msg: string, duration?: number) => push('info', msg, duration),
    consume: (id: number) => {
      queue.value = queue.value.filter(item => item.id !== id);
    },
  };
}
