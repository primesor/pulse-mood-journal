import '@testing-library/jest-dom/vitest';

// Neither this jsdom version nor Node's own experimental global `localStorage`
// (which requires --localstorage-file and otherwise leaves the global
// unusable) provides a working Storage implementation here — window.localStorage
// itself is `undefined`. Polyfill a minimal in-memory Storage so app code
// (which reads the ambient `localStorage` global, as it should in the browser)
// has something real to read/write under test.
class MemoryStorage {
  #store = new Map();
  get length() {
    return this.#store.size;
  }
  clear() {
    this.#store.clear();
  }
  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }
  setItem(key, value) {
    this.#store.set(key, String(value));
  }
  removeItem(key) {
    this.#store.delete(key);
  }
  key(index) {
    return [...this.#store.keys()][index] ?? null;
  }
}

const memoryLocalStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: memoryLocalStorage, writable: true, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: memoryLocalStorage, writable: true, configurable: true });
}
