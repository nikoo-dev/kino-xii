import { API_BASE, TOKEN_KEY } from "./config.js";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

// pending action to replay after login (e.g. { type: 'openBooking', sessionId })
let pendingAction = null;
export function setPendingAction(a) { pendingAction = a; }
export function consumePendingAction() {
  const a = pendingAction;
  pendingAction = null;
  return a;
}

export async function apiFetch(path, { method = "GET", body, formData, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  const token = getToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;
  // if token exists, send it anyway for isMine on seat map
  if (!auth && token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (formData) {
    opts.body = formData; // browser sets content-type
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export function fieldErrors(err) {
  return err?.payload?.errors || null;
}
