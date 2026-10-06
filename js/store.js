import { apiFetch, getToken, setToken } from "./api.js";

export const store = {
  user: null,
  filterOptions: null,
  listeners: new Set(),
  setUser(u) {
    this.user = u;
    this.emit();
  },
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit() {
    for (const fn of this.listeners) fn(this);
  },
};

export async function bootSession() {
  // filter options (cached)
  try {
    const r = await apiFetch("/filter-options");
    store.filterOptions = r.data;
  } catch (e) {
    console.warn("filter-options failed", e);
  }
  const token = getToken();
  if (token) {
    try {
      const me = await apiFetch("/me", { auth: true });
      store.setUser(me.data);
    } catch (e) {
      if (e.status === 401) {
        setToken(null);
        store.setUser(null);
      }
    }
  }
}

export function isAuthed() {
  return !!store.user;
}
