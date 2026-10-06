import { apiFetch } from "../api.js";
import { el, esc, toast, getRecent, fmtReleaseDay, fmtReleaseWeek } from "../utils.js";
import { requireAuthOrModal } from "../components/auth.js";
import { store } from "../store.js";

let heroTimer = null;

export async function renderHome(root) {
  root.innerHTML = `<div class="skeleton" style="height:420px"></div><div class="grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
  try {
    const [featured, nowPlaying, comingSoon] = await Promise.all([
      apiFetch("/movies/featured"),
      apiFetch("/movies/now-playing?limit=12"),
      apiFetch("/movies/coming-soon?limit=8"),
    ]);
    root.innerHTML = "";
    const hero = el(`<div class="hero"></div>`);
    root.appendChild(hero);
    let idx = 0;
    const films = (featured.data || []).slice(0, 4);
    function drawHero() {
      const f = films[idx];
      if (!f) { hero.innerHTML = `<div class="hero-content"><h1>KINO XII</h1></div>`; return; }
      hero.innerHTML = `
        ${f.backdropUrl ? `<img class="hero-bg" src="${esc(f.backdropUrl)}" alt="" />` : ""}
        <div class="hero-content">
          <span class="kicker">Premiere · ${esc(fmtReleaseWeek(f.releaseDate) || "Now showing")}</span>
          <h1>${esc(f.title)}</h1>
          <p>${esc(f.synopsis || "")}</p>
          <div class="hero-meta">
            <span class="badge red">${esc(f.ageRating?.code || "")}</span>
            <span class="badge">◷ ${f.runtimeMinutes} Min</span>
            ${(f.formats || []).slice(0, 2).map((fm) => `<span class="badge">${esc(fm.name)}</span>`).join("")}
          </div>
          <div class="hero-actions">
            <button class="btn primary" data-buy>◆ Buy tickets</button>
            <a class="btn ghost" href="#/sessions">All sessions</a>
          </div>
          <div class="hero-bars">${films.map((_, i) => `<button data-dot="${i}" class="${i === idx ? "active" : ""}"></button>`).join("")}</div>
        </div>
        <div class="hero-arrows"><button data-prev>‹</button><button data-next>›</button></div>`;
      hero.querySelector("[data-buy]").onclick = () => { location.hash = `#/movie/${f.slug}`; };
      hero.querySelectorAll("[data-dot]").forEach((d) => { d.onclick = () => { idx = Number(d.dataset.dot); drawHero(); }; });
      hero.querySelector("[data-prev]").onclick = () => { idx = (idx - 1 + films.length) % films.length; drawHero(); };
      hero.querySelector("[data-next]").onclick = () => { idx = (idx + 1) % films.length; drawHero(); };
    }
    drawHero();
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    if (films.length > 1) {
      heroTimer = setInterval(() => {
        if (!document.body.contains(hero)) { clearInterval(heroTimer); heroTimer = null; return; }
        idx = (idx + 1) % films.length;
        drawHero();
      }, 7000);
    }

    // Recently viewed (authorized only, Figma Home_authorized)
    if (store.user) {
      const recent = getRecent();
      if (recent.length) {
        const rv = el(`<div class="section"><div class="section-head"><h2>Recently viewed</h2></div><div class="recent-grid"></div></div>`);
        const rg = rv.querySelector(".recent-grid");
        for (const m of recent.slice(0, 4)) {
          rg.appendChild(el(`<a class="recent-card" href="#/movie/${esc(m.slug)}"><img src="${esc(m.posterUrl || "")}" /><div><b>${esc(m.title).toUpperCase()}</b><div class="meta">Drama · ${m.runtimeMinutes || 134} min</div><span class="badge red" style="margin-top:6px">${esc(m.ageRating?.code || "12+")}</span></div></a>`));
        }
        root.appendChild(rv);
      }
    }

    const npSec = el(`<div class="section"><div class="section-head"><h2>Now Playing</h2><a href="#/sessions" class="see-all">See all</a></div><div class="grid"></div></div>`);
    root.appendChild(npSec);
    const grid = npSec.querySelector(".grid");
    for (const m of nowPlaying.data || []) grid.appendChild(movieCard(m));

    const csSec = el(`<div class="section"><div class="section-head"><h2>Coming Soon...</h2><a href="#/sessions" class="see-all">See all</a></div><div class="coming-grid"></div></div>`);
    root.appendChild(csSec);
    const csGrid = csSec.querySelector(".coming-grid");
    for (const m of comingSoon.data || []) {
      const card = el(`<div class="coming-card">
        <img loading="lazy" src="${esc(m.posterUrl || "")}" alt="" />
        <div>
          <span class="overline">In cinemas ${esc(fmtReleaseDay(m.releaseDate) || "soon")}</span>
          <div style="font-weight:800;margin:4px 0">${esc(m.title)}</div>
          <div class="meta">Drama · ${m.runtimeMinutes || 134} min</div>
          <div style="margin:8px 0"><span class="badge red">${esc(m.ageRating?.code || "12+")}</span></div>
          <button class="btn-outline" data-notify>🔔 Notify Me</button>
        </div>
      </div>`);
      card.querySelector("[data-notify]").onclick = async () => {
        if (!requireAuthOrModal({ type: "notify", slug: m.slug })) return;
        try { await apiFetch(`/movies/${m.slug}/notify`, { method: "POST", auth: true }); toast("Subscribed"); }
        catch (e) { toast(e.message); }
      };
      csGrid.appendChild(card);
    }
  } catch (e) {
    root.innerHTML = `<div class="error-box">${esc(e.message)} <button class="btn" onclick="location.reload()">Retry</button></div>`;
  }
}

export function movieCard(m) {
  const genre = (m.genres || [])[0]?.name || "Thriller";
  const card = el(`<div class="card">
    <a href="#/movie/${esc(m.slug)}"><img loading="lazy" src="${esc(m.posterUrl || "")}" alt="${esc(m.title)}" /></a>
    <div class="card-body">
      <a href="#/movie/${esc(m.slug)}"><h3>${esc(m.title)}</h3></a>
      <div class="meta">${esc(genre)} · ${m.runtimeMinutes || 102} min</div>
      <div style="margin:8px 0"><span class="badge red">${esc(m.ageRating?.code || "18+")}</span></div>
      <div class="card-foot"><span class="price">From ₾ ${m.fromPrice ?? 14}</span><a class="btn primary small" href="#/movie/${esc(m.slug)}">Buy Ticket</a></div>
    </div>
  </div>`);
  return card;
}
