export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
export function toast(msg) {
  const root = document.getElementById("toast-root");
  const d = el(`<div class="toast"></div>`);
  d.textContent = msg;
  root.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
export function fmtDate(d) {
  return d; // API uses YYYY-MM-DD
}
export function next7Days() {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const weekday = d.toLocaleDateString("en", { weekday: "short" });
    out.push({ iso, weekday, day: d.getDate() });
  }
  return out;
}
const RV_KEY = "kinoxii_recently_viewed";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export function fmtReleaseDay(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function fmtReleaseWeek(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "";
  return `WEEK OF ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4).toUpperCase()}`;
}export function pushRecent(movie) {
  try {
    const arr = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
    const filtered = arr.filter((m) => m.slug !== movie.slug);
    filtered.unshift({ slug: movie.slug, title: movie.title, posterUrl: movie.posterUrl, runtimeMinutes: movie.runtimeMinutes, ageRating: movie.ageRating });
    localStorage.setItem(RV_KEY, JSON.stringify(filtered.slice(0, 6)));
  } catch {}
}
export function getRecent() {
  try { return JSON.parse(localStorage.getItem(RV_KEY) || "[]"); } catch { return []; }
}
