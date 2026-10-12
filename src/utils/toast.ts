export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

type ToastListener = (toasts: ToastMessage[]) => void;

let activeToasts: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

function notify() {
  listeners.forEach((l) => l([...activeToasts]));
}

export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: ToastMessage = { id, message, type };
  activeToasts = [...activeToasts, item];
  notify();

  setTimeout(() => {
    activeToasts = activeToasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export function removeToast(id: string) {
  activeToasts = activeToasts.filter((t) => t.id !== id);
  notify();
}

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  listener([...activeToasts]);
  return () => {
    listeners.delete(listener);
  };
}

// Override window.alert to display non-blocking in-app toasts
// Prevents sandbox iframe DOMException ('allow-modals' missing)
if (typeof window !== 'undefined') {
  window.alert = (msg?: unknown) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg ?? '');
    const isSuccess =
      text.toLowerCase().includes('berhasil') ||
      text.toLowerCase().includes('sukses') ||
      text.toLowerCase().includes('selesai');
    const isError =
      text.toLowerCase().includes('gagal') ||
      text.toLowerCase().includes('ditolak') ||
      text.toLowerCase().includes('dibatasi') ||
      text.toLowerCase().includes('kesalahan') ||
      text.toLowerCase().includes('error');
    showToast(text, isSuccess ? 'success' : isError ? 'error' : 'info');
  };
}
