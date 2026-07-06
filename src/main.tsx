import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global fetch override to bypass the ngrok warning page for API calls
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

  if (url.includes('ngrok-free.dev')) {
    if (input instanceof Request) {
      input.headers.set('ngrok-skip-browser-warning', 'true');
    } else {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        init.headers.set('ngrok-skip-browser-warning', 'true');
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['ngrok-skip-browser-warning', 'true']);
      } else {
        (init.headers as any)['ngrok-skip-browser-warning'] = 'true';
      }
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
