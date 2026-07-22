import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global fetch override to bypass the ngrok warning page and automatically attach JWT token for API calls
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }

  const isBackendCall = url.includes('/api/') || url.startsWith('/api/');

  if (input instanceof Request) {
    if (url.includes('ngrok-free.dev') || isBackendCall) {
      input.headers.set('ngrok-skip-browser-warning', 'true');
    }
    if (isBackendCall) {
      const token = localStorage.getItem("token");
      if (token) {
        input.headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } else {
    init = init || {};
    init.headers = init.headers || {};
    
    const injectHeader = (key: string, value: string) => {
      if (init.headers instanceof Headers) {
        init.headers.set(key, value);
      } else if (Array.isArray(init.headers)) {
        const hasKey = init.headers.some(([k]) => k.toLowerCase() === key.toLowerCase());
        if (!hasKey) {
          init.headers.push([key, value]);
        }
      } else {
        if (!(init.headers as any)[key] && !(init.headers as any)[key.toLowerCase()]) {
          (init.headers as any)[key] = value;
        }
      }
    };

    if (url.includes('ngrok-free.dev') || isBackendCall) {
      injectHeader('ngrok-skip-browser-warning', 'true');
    }
    if (isBackendCall) {
      const token = localStorage.getItem("token");
      if (token) {
        injectHeader('Authorization', `Bearer ${token}`);
      }
    }
  }
  return originalFetch(input, init).then((res) => {
    if (res.status === 401 && isBackendCall) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return res;
  });
};

createRoot(document.getElementById("root")!).render(<App />);
