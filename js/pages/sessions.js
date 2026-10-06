import { apiFetch } from "../api.js";
import { store } from "../store.js";
import { el, esc, next7Days } from "../utils.js";
import { openBookingModal } from "../components/booking.js";
import { requireAuthOrModal } from "../components/auth.js";

function readQuery() {
  const h = location.hash;
  const qi = h.indexOf("?");
  const params = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
  return {
    date: params.get("date") || new Date().toISOString().slice(0, 10),
    venues: params.getAll("venues[]"),
    formats: params.getAll("formats[]"),
    languages: params.getAll("languages[]"),
    bands: params.getAll("bands[]"),
    search: params.get("search") || "",
    sort: params.get("sort") || "time_asc",
    page: Number(params.get("page") || 1),
  };
}
function writeQuery(q) {
  const p = new URLSearchParams();
  if (q.date) p.set("date", q.date);
  q.venues.forEach((v) => p.append("venues[]", v));
  q.formats.forEach((f) => p.append("formats[]", f));
  q.languages.forEach((l) => p.append("languages[]", l));
  q.bands.forEach((b) => p.append("bands[]", b));
  if (q.search) p.set("search", q.search);
  if (q.sort) p.set("sort", q.sort);
  if (q.page !== 1) p.set("page", q.page);
  history.replaceState(null, "", `#/sessions${p.toString() ? "?" + p.toString() : ""}`);
}

export async function renderSessions(root) {
  const opts = store.filterOptions;
  if (!opts) { root.innerHTML = `<div class="error-box">Filter options not loaded.</div>`; return; }
  let q = readQuery();
  root.innerHTML = `<div class="sessions-title"><h1>Sessions</h1><p>Browse showtimes across all venues</p></div>
  <div class="sessions-layout"><aside class="filters" data-filters></aside>
  <div><div data-toolbar></div><div data-list></div><div data-pager class="pager"></div></div></div>`;
  const fEl = root.querySelector("[data-filters]");
  const listEl = root.querySelector("[data-list]");
  const pagerEl = root.querySelector("[data-pager]");
  const toolEl = root.querySelector("[data-toolbar]");

  function drawFilters() {
    let visibleFormats = opts.formats;
    if (q.venues.length) {
      const set = new Set();
      for (const v of opts.venues) if (q.venues.includes(v.slug)) for (const f of v.formats) set.add(f.slug);
      visibleFormats = opts.formats.filter((f) => set.has(f.slug));
      q.formats = q.formats.filter((f) => set.has(f));
    }
    const days = next7Days();
    const timeBands = opts.timeBands || [{ id: "morning", label: "Morning · before 12:00" }, { id: "afternoon", label: "Afternoon · 12:00–18:00" }, { id: "evening", label: "Evening · after 18:00" }];
    fEl.innerHTML = `<h2>Filters</h2>
      <h3>Venue</h3>
      ${opts.venues.map((v) => `<label class="check"><input type="checkbox" data-v="${esc(v.slug)}" ${q.venues.includes(v.slug) ? "checked" : ""} /> ${esc(v.name)} <small>· ${esc(v.city)}</small></label>`).join("")}
      <h3>Date</h3>
      <div class="date-strip">${days.map((d) => `<button data-date="${d.iso}" class="${q.date === d.iso ? "active" : ""}">${d.weekday}<b>${d.day}</b></button>`).join("")}</div>
      <h3>Format</h3>
      ${visibleFormats.map((f) => `<label class="check"><input type="checkbox" data-f="${esc(f.slug)}" ${q.formats.includes(f.slug) ? "checked" : ""} /> ${esc(f.name)}</label>`).join("")}
      <h3>Language</h3>
      ${opts.languages.map((l) => `<label class="check"><input type="checkbox" data-l="${esc(l.slug)}" ${q.languages.includes(l.slug) ? "checked" : ""} /> ${esc(l.name)}</label>`).join("")}
      <h3>Time of day</h3>
      ${timeBands.map((b) => `<label class="check"><input type="checkbox" data-b="${esc(b.id)}" ${q.bands.includes(b.id) ? "checked" : ""} /> ${esc(b.label)}</label>`).join("")}
      <div class="meta" style="margin-top:16px">${q.venues.length + q.formats.length + q.languages.length + q.bands.length} filters active</div>`;
    fEl.querySelectorAll("[data-v]").forEach((c) => c.onchange = () => { const s = c.dataset.v; q.venues = c.checked ? [...q.venues, s] : q.venues.filter((x) => x !== s); q.page = 1; writeQuery(q); drawFilters(); load(); });
    fEl.querySelectorAll("[data-date]").forEach((b) => b.onclick = () => { q.date = b.dataset.date; q.page = 1; writeQuery(q); drawFilters(); load(); });
    fEl.querySelectorAll("[data-f]").forEach((c) => c.onchange = () => { const s = c.dataset.f; q.formats = c.checked ? [...q.formats, s] : q.formats.filter((x) => x !== s); q.page = 1; writeQuery(q); load(); });
    fEl.querySelectorAll("[data-l]").forEach((c) => c.onchange = () => { const s = c.dataset.l; q.languages = c.checked ? [...q.languages, s] : q.languages.filter((x) => x !== s); q.page = 1; writeQuery(q); load(); });
    fEl.querySelectorAll("[data-b]").forEach((c) => c.onchange = () => { const s = c.dataset.b; q.bands = c.checked ? [...q.bands, s] : q.bands.filter((x) => x !== s); q.page = 1; writeQuery(q); load(); });
  }

  function drawToolbar(meta) {
    const sorts = opts.sorts || [{ id: "time_asc", label: "Showtime: earliest first" }, { id: "time_desc", label: "Showtime: latest first" }, { id: "price_asc", label: "Price: low to high" }, { id: "price_desc", label: "Price: high to low" }, { id: "title_asc", label: "Title: A-Z" }];
    toolEl.innerHTML = `<div style="display:flex;gap:12px;align-items:center;margin-bottom:20px">
      <b style="font-size:14px">${meta ? `Showing ${meta.totalSessions} sessions` : ""}</b>
      <label class="meta" style="margin-left:auto">Sort: <select data-sort style="background:transparent;border:0;color:#fff;font-weight:800">${sorts.map((s) => `<option value="${s.id}" ${q.sort === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></label>
    </div>`;
    toolEl.querySelector("[data-sort]").onchange = (e) => { q.sort = e.target.value; q.page = 1; writeQuery(q); load(); };
  }

  async function load() {
    listEl.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
    pagerEl.innerHTML = "";
    drawToolbar(null);
    const p = new URLSearchParams();
    if (q.date) p.set("date", q.date);
    q.venues.forEach((v) => p.append("venues[]", v));
    q.formats.forEach((f) => p.append("formats[]", f));
    q.languages.forEach((l) => p.append("languages[]", l));
    q.bands.forEach((b) => p.append("bands[]", b));
    if (q.search) p.set("search", q.search);
    if (q.sort) p.set("sort", q.sort);
    p.set("page", q.page);
    try {
      const res = await apiFetch(`/sessions?${p.toString()}`);
      const groups = res.data || [];
      const meta = res.meta;
      if (!groups.length) {
        listEl.innerHTML = `<div class="empty">Check the spelling or try another film.</div>`;
      } else {
        listEl.innerHTML = "";
        for (const g of groups) {
          const gd = el(`<div class="session-group"><div class="movie-head">
            <img src="${esc(g.movie.posterUrl || "")}" /><div><b>${esc(g.movie.title)}</b> <span class="badge red" style="margin-left:8px">${esc(g.movie.ageRating?.code || "")}</span>
            <div class="meta">${g.movie.runtimeMinutes || 134} min</div></div></div><div class="session-cards"></div></div>`);
          const cards = gd.querySelector(".session-cards");
          for (const s of g.sessions || []) {
            const left = s.seatsLeft ?? 0;
            const cls = s.isSoldOut ? "soldout" : "";
            const leftCls = s.isSoldOut ? "" : (left <= 5 ? "low" : "ok");
            const leftTxt = s.isSoldOut ? "Sold out" : `◆ ${left} left`;
            const row = el(`<div class="session-card ${cls}">
              <div class="time-row"><span class="time">${esc(s.time || s.startTime || "")}</span><span class="badge">${esc(s.format?.name || "Standard")}</span></div>
              <div class="meta" style="margin:8px 0">Original + Subtitles</div>
              <div class="time-row"><span class="meta">${esc(s.venue?.name || "")} · Hall ${esc(s.hall?.name || s.hall || "D")}</span></div>
              <div class="time-row" style="margin-top:8px"><span class="seats-left ${leftCls}">${leftTxt}</span><b>₾${s.price ?? 22}</b></div>
            </div>`);
            if (!s.isSoldOut) {
              row.style.cursor = "pointer";
              row.onclick = () => {
                if (!store.user) { requireAuthOrModal({ type: "openBooking", sessionId: s.id }); return; }
                openBookingModal(s.id);
              };
            }
            cards.appendChild(row);
          }
          listEl.appendChild(gd);
        }
      }
      drawToolbar(meta);
      if (meta && meta.lastPage > 1) {
        pagerEl.innerHTML = "";
        const prev = el(`<button class="btn ghost">‹</button>`);
        if (meta.currentPage <= 1) prev.disabled = true;
        prev.onclick = () => { q.page = meta.currentPage - 1; writeQuery(q); load(); };
        pagerEl.appendChild(prev);
        for (let i = 1; i <= meta.lastPage; i++) {
          if (meta.lastPage > 7 && Math.abs(i - meta.currentPage) > 2 && i !== 1 && i !== meta.lastPage) continue;
          const b = el(`<button class="btn ${i === meta.currentPage ? "primary" : "ghost"}">${i}</button>`);
          b.onclick = () => { q.page = i; writeQuery(q); load(); };
          pagerEl.appendChild(b);
        }
        const next = el(`<button class="btn ghost">›</button>`);
        if (meta.currentPage >= meta.lastPage) next.disabled = true;
        next.onclick = () => { q.page = meta.currentPage + 1; writeQuery(q); load(); };
        pagerEl.appendChild(next);
      }
    } catch (e) {
      listEl.innerHTML = `<div class="error-box">${esc(e.message)} <button class="btn" data-r>Retry</button></div>`;
      listEl.querySelector("[data-r]").onclick = load;
    }
  }
  drawFilters();
  load();
}
