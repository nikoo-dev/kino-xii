import { apiFetch, fieldErrors } from "../api.js";
import { store } from "../store.js";
import { el, esc, toast } from "../utils.js";
import { fullNameError, emailError, mobileError, cardError, expiryError, cvvError } from "../validation.js";
import { openModal, setLoading, attachBlurValidation } from "./modal.js";
import { requireAuthOrModal } from "./auth.js";

export async function openBookingModal(sessionId) {
  if (!requireAuthOrModal({ type: "openBooking", sessionId })) return;
  const wrap = el(`<div><p>Loading session...</p><div class="skeleton"></div></div>`);
  const { close, box } = openModal(wrap, {
    wide: true,
    onClose: () => {
      if (state.holdId && !state.paid) apiFetch(`/holds/${state.holdId}`, { method: "DELETE", auth: true }).catch(() => {});
      if (state.timer) clearInterval(state.timer);
    },
  });
  const state = { sessionId, session: null, seats: null, selected: new Map(), holdId: null, expiresAt: null, timer: null, paid: false, step: 1, hold: null };
  try {
    const [sRes, seatRes] = await Promise.all([apiFetch(`/sessions/${sessionId}`), apiFetch(`/sessions/${sessionId}/seats`)]);
    state.session = sRes.data; state.seats = seatRes.data;
  } catch (e) {
    wrap.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    return;
  }
  const minAge = state.session.movie?.ageRating?.minAge ?? 0;
  if (minAge >= 16 && store.user?.age != null && store.user.age < minAge) {
    box.innerHTML = `<div class="error-box">This film is rated ${esc(state.session.movie.ageRating.code)}. You cannot buy tickets for it with this account.</div>`;
    return;
  }
  if (!store.user?.profileComplete) {
    box.innerHTML = `<div class="banner warn">Please complete your profile to enable booking. <a href="#/profile" data-close-link class="link">Go to profile</a></div>`;
    box.querySelector("[data-close-link]").onclick = () => close();
    return;
  }
  renderStep1();

  function headerHtml(timerHtml = "") {
    const s = state.session;
    return `<div style="display:flex;gap:16px;align-items:start">
      <div><h2 style="text-transform:uppercase">${esc(s.movie?.title || "")}</h2>
      <div class="meta">${esc(s.venue?.name || "")} · Hall ${esc(s.hall?.name || s.hall || "B")} · ${esc(s.date || "")} · ${esc(s.time || s.startTime || "")} · ${esc(s.format?.name || "")} · ${esc(s.language?.name || "Original + Subtitles")}</div></div>
      ${timerHtml}
    </div>
    <div class="booking-steps"><div class="${state.step === 1 ? "active" : ""}">SEATS</div><div class="${state.step === 2 ? "active" : ""}">CHECKOUT</div></div>`;
  }

  function renderStep1(warn = "") {
    state.step = 1;
    const max = store.filterOptions?.maxSeatsPerOrder || 3;
    const ticketTypes = store.filterOptions?.ticketTypes || [{ slug: "adult", name: "Adult", priceRatio: 1 }, { slug: "child", name: "Child", priceRatio: 0.6, blockedFromRatingAge: 16 }, { slug: "student", name: "Student", priceRatio: 0.75 }];
    const allowed = ticketTypes.filter((t) => !(t.blockedFromRatingAge && minAge >= t.blockedFromRatingAge));
    box.innerHTML = `${headerHtml()}${warn ? `<div class="banner warn">${esc(warn)}</div>` : ""}
    <div class="booking-grid"><div><div class="screen-bar">SCREEN</div><div data-map></div>
      <div class="legend"><span><i style="background:transparent"></i>Available</span><span><i style="background:var(--brand-red);border-color:var(--brand-red)"></i>Selected</span><span><i style="background:var(--bg-2)"></i>Sold</span><span><i style="background:repeating-linear-gradient(45deg,#2A2C3D,#2A2C3D 4px,#3a3d55 4px,#3a3d55 8px)"></i>Held by another user</span></div>
    </div><div><h3 style="font-size:14px">Your seats · Max ${max}</h3><p class="meta">Pick up to ${max} seats from the map. Each seat can carry its own ticket type.</p><div data-sum></div>
      <div style="display:flex;justify-content:space-between;margin:16px 0"><span class="overline">Subtotal</span><b data-total>₾ 0</b></div>
      <button class="btn primary" data-next style="width:100%">Next: Checkout</button></div></div>`;
    const mapDiv = box.querySelector("[data-map]");
    for (const section of state.seats.sections || []) {
      mapDiv.appendChild(el(`<div class="seat-section-title">${esc(section.name)} · ROWS ${esc((section.rows || []).map((r) => r.label).join(""))}</div>`));
      for (const row of section.rows || []) {
        const rowDiv = el(`<div class="seat-row"></div>`);
        rowDiv.appendChild(el(`<span class="rlab">${esc(row.label)}</span>`));
        for (const seat of row.seats || []) {
          if (seat.state === "unavailable") { rowDiv.appendChild(el(`<span class="seat-gap"></span>`)); }
          else {
            const b = el(`<button class="seat ${seat.state} ${state.selected.has(seat.id) ? "selected" : ""}">${esc(seat.label)}</button>`);
            if (seat.state !== "available" && !state.selected.has(seat.id)) b.disabled = true;
            b.title = seat.code;
            b.onclick = () => {
              if (state.selected.has(seat.id)) state.selected.delete(seat.id);
              else {
                if (seat.state !== "available") return;
                if (state.selected.size >= max) { toast(`You can select up to ${max} seats`); return; }
                state.selected.set(seat.id, { seat, ticketType: "adult" });
              }
              renderStep1();
            };
            rowDiv.appendChild(b);
          }
          if (seat.aisleAfter) rowDiv.appendChild(el(`<span class="aisle"></span>`));
        }
        mapDiv.appendChild(rowDiv);
      }
    }
    const sumDiv = box.querySelector("[data-sum]");
    const base = state.session.price ?? 16;
    let subtotal = 0;
    sumDiv.innerHTML = state.selected.size ? "" : `<div class="empty">No seats selected</div>`;
    const pct = { adult: "100%", student: "75%", child: "60%" };
    for (const [id, v] of state.selected) {
      const tt = allowed.find((t) => t.slug === v.ticketType) || allowed[0];
      const price = +(base * (tt.priceRatio ?? 1)).toFixed(2);
      v._price = price; subtotal += price;
      const pills = allowed.map((t) => `<button class="pill ${v.ticketType === t.slug ? "active" : ""}" data-pill="${t.slug}" data-seat="${id}">${esc(t.name)} ${pct[t.slug] || ""}</button>`).join("");
      const r = el(`<div class="seat-type-card"><div class="time-row"><span class="meta">Seat</span><b>${esc(v.seat.code)}</b><span style="margin-left:auto">₾${price}</span><button class="link" data-remove="${id}" style="color:var(--text-secondary)">✕</button></div><div class="pill-row">${pills}</div></div>`);
      sumDiv.appendChild(r);
    }
    box.querySelector("[data-total]").textContent = `₾ ${subtotal.toFixed(0)}`;
    sumDiv.querySelectorAll("[data-pill]").forEach((p) => p.onclick = () => { state.selected.get(Number(p.dataset.seat)).ticketType = p.dataset.pill; renderStep1(); });
    sumDiv.querySelectorAll("[data-remove]").forEach((x) => x.onclick = () => { state.selected.delete(Number(x.dataset.remove)); renderStep1(); });
    box.querySelector("[data-next]").onclick = async (e) => {
      const btn = e.currentTarget;
      if (!state.selected.size) { toast("Select at least one seat"); return; }
      setLoading(btn, true);
      try {
        const seats = [...state.selected.entries()].map(([seatId, v]) => ({ seatId, ticketType: v.ticketType }));
        const res = await apiFetch(`/sessions/${sessionId}/holds`, { method: "POST", auth: true, body: { seats } });
        state.holdId = res.data.holdId || res.data.id; state.expiresAt = res.data.expiresAt; state.hold = res.data;
        renderStep2();
      } catch (err) {
        if (err.status === 409) {
          const contested = err.payload?.contested || [];
          for (const [id, v] of [...state.selected]) if (contested.includes(v.seat.code)) state.selected.delete(id);
          const sr = await apiFetch(`/sessions/${sessionId}/seats`); state.seats = sr.data;
          renderStep1(`Some of those seats were just taken: ${contested.join(", ")}.`);
        } else if (err.status === 422 && !err.payload?.errors) {
          toast(err.payload?.message || err.message);
          if (/profile/i.test(err.payload?.message || "")) location.hash = "#/profile";
        } else if (err.status === 401) { const { openLoginModal } = await import("./auth.js"); openLoginModal({ type: "openBooking", sessionId }); close(); }
        else toast(fieldErrors(err) ? JSON.stringify(fieldErrors(err)) : err.message);
      } finally { setLoading(btn, false); }
    };
  }

  function renderStep2() {
    state.step = 2;
    box.innerHTML = `${headerHtml(`<div class="timer-box"><b>SEATS HELD</b><span class="timer" data-timer>8:00</span></div>`)}
    <div class="booking-grid"><div><h3>Checkout</h3><div data-sum2></div>
      <div class="field"><label>Full Name</label><input name="fullName" value="${esc(store.user.fullName || "")}" /><div class="err"></div></div>
      <div class="field"><label>Email</label><input name="email" value="${esc(store.user.email || "")}" /><div class="err"></div></div>
      <div class="field"><label>Mobile Number</label><input name="mobileNumber" value="${esc(store.user.mobileNumber || "")}" /><div class="err"></div></div>
      <div class="field"><label>Card Number</label><input name="cardNumber" placeholder="4242 4242 4242 4242" /><div class="err"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label>Expiry MM/YY</label><input name="expiry" placeholder="09/30" /><div class="err"></div></div>
      <div class="field"><label>CVV</label><input name="cvv" placeholder="123" /><div class="err"></div></div></div>
      <div class="err" data-server></div></div>
    <div><h3>Order summary</h3><div data-osum></div><div style="display:flex;justify-content:space-between;margin:12px 0"><span class="overline">Total</span><b data-ttotal></b></div>
      <button class="btn primary" data-pay style="width:100%">Pay & Complete Order</button>
      <button class="btn ghost" data-back style="width:100%;margin-top:8px">Back to seats</button></div></div>`;
    const hold = state.hold;
    box.querySelector("[data-sum2]").innerHTML = (hold?.seats || []).map((s) => `<div class="session-card" style="margin-bottom:8px"><div class="time-row"><b>${esc(s.code)}</b><span>${esc(s.ticketType?.name || "")}</span><b>₾${s.price}</b></div></div>`).join("");
    box.querySelector("[data-osum]").innerHTML = box.querySelector("[data-sum2]").innerHTML;
    box.querySelector("[data-ttotal]").textContent = `₾${hold?.total ?? hold?.subtotal ?? 0}`;
    const timerEl = box.querySelector("[data-timer]");
    const tick = () => {
      const ms = new Date(state.expiresAt).getTime() - Date.now();
      const s = Math.max(0, Math.floor(ms / 1000));
      timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s <= 0) { clearInterval(state.timer); state.holdId = null; state.selected.clear(); apiFetch(`/sessions/${sessionId}/seats`).then((r) => { state.seats = r.data; }).finally(() => renderStep1("Your hold time expired. Please re-select your seats.")); }
    };
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000); tick();
    const checks = {
      fullName: attachBlurValidation(box.querySelector("[name=fullName]"), fullNameError),
      email: attachBlurValidation(box.querySelector("[name=email]"), emailError),
      mobileNumber: attachBlurValidation(box.querySelector("[name=mobileNumber]"), mobileError),
      cardNumber: attachBlurValidation(box.querySelector("[name=cardNumber]"), cardError),
      expiry: attachBlurValidation(box.querySelector("[name=expiry]"), expiryError),
      cvv: attachBlurValidation(box.querySelector("[name=cvv]"), cvvError),
    };
    box.querySelector("[data-back]").onclick = () => { clearInterval(state.timer); renderStep1(); };
    box.querySelector("[data-pay]").onclick = async (e) => {
      const btn = e.currentTarget;
      if (Object.values(checks).some((fn) => fn())) return;
      const g = (n) => box.querySelector(`[name=${n}]`).value.trim();
      setLoading(btn, true, "Paying...");
      try {
        const res = await apiFetch("/orders", { method: "POST", auth: true, body: { holdId: state.holdId, fullName: g("fullName"), email: g("email"), mobileNumber: g("mobileNumber"), cardNumber: g("cardNumber"), expiry: g("expiry"), cvv: g("cvv") } });
        state.paid = true; clearInterval(state.timer);
        box.innerHTML = `<h2>Order paid ✓</h2><p>Reference: <b>${esc(res.data.reference)}</b></p>${(res.data.tickets || []).map((t) => `<div class="session-card" style="margin-bottom:8px"><div class="time-row"><b>${esc(t.seatCode)}</b><span>${esc(t.ticketType?.name)}</span><b>₾${t.price}</b></div></div>`).join("")}<p>Total paid: ₾${res.data.totalPrice}</p><div class="form-footer"><a class="btn primary" href="#/profile">My Tickets</a></div>`;
      } catch (err) {
        if (err.status === 422 && err.payload?.errors) for (const [k, msgs] of Object.entries(err.payload.errors)) {
          const inp = box.querySelector(`[name=${k}]`);
          if (inp) { inp.classList.add("invalid"); inp.parentElement.querySelector(".err").textContent = msgs.join(", "); }
        }
        else if (err.status === 422) { box.querySelector("[data-server]").textContent = err.payload?.message || err.message; }
        else box.querySelector("[data-server]").textContent = err.payload?.message || err.message;
      } finally { setLoading(btn, false); }
    };
  }
}
