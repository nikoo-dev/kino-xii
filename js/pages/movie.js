import { apiFetch } from "../api.js";
import { store } from "../store.js";
import { el, esc, toast, pushRecent } from "../utils.js";
import { openBookingModal } from "../components/booking.js";
import { requireAuthOrModal } from "../components/auth.js";

export async function renderMovie(root, slug) {
  root.innerHTML = `<div class="skeleton" style="height:300px"></div>`;
  try {
    const res = await apiFetch(`/movies/${slug}`);
    const m = res.data;
    pushRecent(m);
    root.innerHTML = `
      <div class="detail-hero">
        ${m.backdropUrl ? `<img class="bg" src="${esc(m.backdropUrl)}" />` : ""}
        <div class="detail-hero-inner">
          <img class="poster" src="${esc(m.posterUrl || "")}" />
          <div>
            <span class="kicker">Now Playing</span>
            <h1 style="font-size:40px;font-weight:800;margin:0 0 8px;text-transform:uppercase">${esc(m.title)}</h1>
            <p style="max-width:560px;color:#fff;font-size:16px">${esc(m.synopsis || "")}</p>
            <div class="hero-meta"><span class="badge red">${esc(m.ageRating?.code || "")}</span><span class="badge">◷ ${m.runtimeMinutes} Min</span>${(m.formats || []).map((f) => `<span class="badge">${esc(f.name)}</span>`).join("")}</div>
          </div>
        </div>
      </div>
      <div class="detail-grid">
        <div><h2 style="font-size:20px">Sessions</h2><div class="date-strip" data-dates style="margin:16px 0"></div><div data-slots></div></div>
        <div class="detail-side"><h3>Details</h3><div data-details></div></div>
      </div>`;
    const det = root.querySelector("[data-details]");
    det.innerHTML = `
      <div class="row"><span class="overline">Director</span><b>${esc(m.director || "Elene Kapanadze")}</b></div>
      <div class="row"><span class="overline">Main cast</span><b>${esc((m.cast || ["David Merabishvili, Ana Lomidze"]).join ? (m.cast || []).join(", ") : "—")}</b></div>
      <div class="row"><span class="overline">Duration</span><b>${m.runtimeMinutes} minutes</b></div>
      <div class="row"><span class="overline">Release date</span><b>${esc(m.releaseDate || "")}</b></div>
      <div class="row"><span class="overline">Formats</span><b>${(m.formats || []).map((f) => esc(f.name)).join(", ")}</b></div>
      <div class="row"><span class="overline">From</span><b>₾${m.fromPrice ?? 16}</b></div>
      <div class="rating-note"><b>Rating note</b>${esc(m.ageRating?.code || "")} · ${esc(m.ageRating?.description || "")}</div>`;

    const datesEl = root.querySelector("[data-dates]");
    const slotsEl = root.querySelector("[data-slots]");
    const available = m.availableDates || [];
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) { const d = new Date(today); d.setDate(today.getDate() + i); days.push(d); }
    let selected = available[0] || days[0].toISOString().slice(0, 10);
    function drawDates() {
      datesEl.innerHTML = "";
      for (const d of days) {
        const iso = d.toISOString().slice(0, 10);
        const disabled = available.length ? !available.includes(iso) : false;
        const b = el(`<button class="${iso === selected ? "active" : ""}" ${disabled ? "disabled" : ""}>${d.toLocaleDateString("en", { weekday: "short" })}<b>${d.getDate()}</b></button>`);
        if (!disabled) b.onclick = () => { selected = iso; drawDates(); loadSlots(); };
        datesEl.appendChild(b);
      }
    }
    async function loadSlots() {
      slotsEl.innerHTML = `<div class="skeleton"></div>`;
      try {
        const r = await apiFetch(`/movies/${slug}/sessions?date=${selected}`);
        const groups = r.data || [];
        if (!groups.length) { slotsEl.innerHTML = `<div class="empty">No sessions on this date.</div>`; return; }
        slotsEl.innerHTML = "";
        for (const g of groups) {
          const gd = el(`<div style="margin-bottom:20px"><b>${esc(g.venue?.name || "")}</b><div class="session-cards" style="margin-top:12px"></div></div>`);
          const cards = gd.querySelector(".session-cards");
          for (const s of g.sessions || []) {
            const row = el(`<div class="session-card ${s.isSoldOut ? "soldout" : ""}">
              <div class="time-row"><span class="time">${esc(s.startTime || "")}</span><span style="color:var(--brand-red);font-weight:800">₾ ${s.price ?? 16}</span></div>
              <div class="time-row" style="margin-top:8px"><span class="meta">ENG <span class="badge">${esc(s.format?.name || "MAX")}</span></span><span class="meta">◆ ${s.seatsLeft ?? 45} left</span></div>
            </div>`);
            if (!s.isSoldOut) row.onclick = () => {
              if (store.user && store.user.age != null && store.user.age < (m.ageRating?.minAge || 0)) { toast(`This film is rated ${m.ageRating.code}. You cannot buy tickets for it with this account.`); return; }
              if (!store.user) { requireAuthOrModal({ type: "openBooking", sessionId: s.id }); return; }
              if (!store.user.profileComplete) { toast("Please complete your profile to enable booking."); location.hash = "#/profile"; return; }
              openBookingModal(s.id);
            };
            cards.appendChild(row);
          }
          slotsEl.appendChild(gd);
        }
      } catch (e) { slotsEl.innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
    }
    drawDates(); loadSlots();
  } catch (e) { root.innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
}
