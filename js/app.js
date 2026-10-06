import { store, bootSession } from "./store.js";
import { apiFetch, setToken } from "./api.js";
import { el, esc, debounce } from "./utils.js";
import { renderHome } from "./pages/home.js";
import { renderSessions } from "./pages/sessions.js";
import { renderMovie } from "./pages/movie.js";
import { renderProfile } from "./pages/profile.js";
import { openLoginModal, openRegisterModal } from "./components/auth.js";

export function renderNav() {
  const navAuth = document.getElementById("nav-auth");
  const u = store.user;
  navAuth.innerHTML = "";
  if (!u) {
    const signup = el(`<button class="btn primary small">Sign up</button>`);
    signup.onclick = () => openRegisterModal();
    const login = el(`<button class="btn white small">Log in</button>`);
    login.onclick = () => openLoginModal();
    navAuth.appendChild(signup);
    navAuth.appendChild(login);
  } else {
    // Figma authorized: [MS] Meri v with orange dot if incomplete
    const initials = esc(((u.username || u.fullName || u.email || "U").slice(0, 2)).toUpperCase());
    const name = esc(u.fullName?.split(" ")[0] || u.username || "Meri");
    const dot = u.profileComplete ? "" : `<span class="nav-dot"></span>`;
    const dd = el(`<div class="dropdown"><button class="profile-btn"><span class="profile-avatar">${initials}${dot}</span><span>${name}</span><span style="color:var(--text-secondary)">⌄</span></button><div class="dropdown-menu hidden"><a href="#/profile">My Profile</a><button data-logout>Logout</button></div></div>`);
    navAuth.appendChild(dd);
    const btn = dd.querySelector(".profile-btn");
    const menu = dd.querySelector(".dropdown-menu");
    btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle("hidden"); };
    document.addEventListener("click", () => menu.classList.add("hidden"), { once: true });
    dd.querySelector("[data-logout]").onclick = async () => {
      try { await apiFetch("/logout", { method: "POST", auth: true }); } catch {}
      setToken(null);
      store.setUser(null);
      renderNav();
      location.hash = "#/";
    };
  }
}

function router() {
  const app = document.getElementById("app");
  const hash = location.hash || "#/";
  if (hash.startsWith("#/sessions")) renderSessions(app);
  else if (hash.startsWith("#/movie/")) {
    const slug = hash.split("#/movie/")[1].split("?")[0];
    renderMovie(app, slug);
  }
  else if (hash.startsWith("#/profile")) renderProfile(app);
  else renderHome(app);
}

function initSearch() {
  const input = document.getElementById("global-search");
  const box = document.getElementById("search-results");
  const showPrompt = () => {
    box.innerHTML = `<div class="search-prompt"><div class="search-prompt-icon">🍿</div><b>What do you want to watch?</b><div class="meta">Search by title, director or cast</div><a class="btn ghost small" href="#/sessions" style="margin-top:12px">Browse all sessions</a></div>`;
    box.classList.remove("hidden");
  };
  input.addEventListener("focus", () => { if (!input.value.trim()) showPrompt(); });
  const doSearch = debounce(async () => {
    const q = input.value.trim();
    if (!q) { showPrompt(); return; }
    box.innerHTML = `<div class="search-prompt"><div class="meta">Searching...</div></div>`;
    box.classList.remove("hidden");
    try {
      const res = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
      const items = res.data || [];
      if (!items.length) {
        box.innerHTML = `<div class="search-prompt"><div class="search-prompt-icon">🔍</div><b>No results found</b><div class="meta">Check the spelling or try another film.</div><a class="btn ghost small" href="#/sessions" style="margin-top:12px">Browse all sessions</a></div>`;
      } else {
        box.innerHTML = items.slice(0, 6).map((m) => `<a class="search-item" href="#/movie/${esc(m.slug)}"><img src="${esc(m.posterUrl || "")}" /><span><b>${esc(m.title)}</b><span class="meta">${esc((m.genres || [])[0]?.name || "")} · ${m.runtimeMinutes || ""} min</span></span></a>`).join("");
      }
      box.classList.remove("hidden");
    } catch { box.classList.add("hidden"); }
  }, 300);
  input.addEventListener("input", doSearch);
  input.addEventListener("blur", () => setTimeout(() => box.classList.add("hidden"), 250));
}

async function init() {
  store.subscribe(() => renderNav());
  renderNav();
  initSearch();
  await bootSession();
  renderNav();
  router();
  window.addEventListener("hashchange", router);
}

init();
