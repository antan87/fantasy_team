import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Store original localStorage methods
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

// Override localStorage.setItem to persist to SQLite backend
(localStorage as any).setItem = function (key: string, value: string) {
  originalSetItem.call(localStorage, key, value);
  fetch('http://localhost:3001/api/persistence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  }).catch(err => console.error('Failed to sync to SQLite DB:', err));
};

// Override localStorage.removeItem to persist deletion to SQLite backend
(localStorage as any).removeItem = function (key: string) {
  originalRemoveItem.call(localStorage, key);
  fetch(`http://localhost:3001/api/persistence?key=${encodeURIComponent(key)}`, {
    method: 'DELETE'
  }).catch(err => console.error('Failed to sync deletion to SQLite DB:', err));
};

// Seed localStorage from SQLite DB before mounting the app
async function seedLocalStorage() {
  try {
    const res = await fetch('http://localhost:3001/api/persistence');
    if (res.ok) {
      const data = await res.json();
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          originalSetItem.call(localStorage, key, value);
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch initial state from SQLite DB:', err);
  }
}

seedLocalStorage().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
