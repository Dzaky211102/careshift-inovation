import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { showToast } from './utils/toast';

// Safe in-app alert interceptor for sandboxed preview environment
if (typeof window !== 'undefined') {
  window.alert = function (message?: any) {
    try {
      showToast(String(message || ''), 'info');
    } catch {
      console.warn('[CareShift] Intercepted alert:', message);
    }
  };
}

createRoot(document.getElementById('root')!).render(<App />);
