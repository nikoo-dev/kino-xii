import { apiFetch, fieldErrors } from "../api.js";
import { store } from "../store.js";
import { el, esc, toast } from "../utils.js";
import { setLoading } from "../components/modal.js";
import { requireAuthOrModal } from "../components/auth.js";

export async function renderProfile(root) {
  if (!store.user) {
    requireAuthOrModal({ type: "goProfile" });
    root.innerHTML = `<div class="empty">Please log in to view your profile.</div>`;
    return;
  }
  root.innerHTML = `<h1 style="font-size:24px;margin:24px 0 0">My Profile</h1>
  <div class="profile-tabs"><button class="active" data-tab="info">Personal Information</button><button data-tab="tickets">My Tickets <span class="count" data-count>2</span></button></div>
  <div data-banner></div><div data-body></div>`;
  const bannerEl = root.querySelector("[data-banner]");
  const bodyEl = root.querySelector("[data-body]");
  let tab = "info";
  const tabs = [...root.querySelectorAll("[data-tab]")];

  function drawBanner() {
    const u = store.user;
    bannerEl.innerHTML = u.profileComplete
      ? `<div class="banner ok">Profile Complete ✓ — You are ${u.age ?? "?"}, eligible for all allowed ratings.</div>`
      : `<div class="banner warn">Please complete your profile to enable booking.</div>`;
  }

  function drawInfo() {
    const u = store.user;
    const venues = store.filterOptions?.venues || [];
    bodyEl.innerHTML = `<div class="profile-grid"><div>
      <div class="field"><label>Full name</label><input name="fullName" value="${esc(u.fullName || "")}" /><div class="err"></div></div>
      <div class="field"><label>Email</label><input name="email" value="${esc(u.email || "")}" disabled /><div class="err"></div><div class="meta">Set at registration and cannot be changed</div></div>
      <div class="field"><label>Mobile number</label><input name="mobileNumber" value="${esc(u.mobileNumber || "")}" placeholder="555 123 456" /><div class="err"></div></div>
      <div class="field"><label>Date of birth</label><input name="dateOfBirth" type="date" value="${esc(u.dateOfBirth || "")}" /><div class="err"></div></div>
      <div class="field"><label>Preferred Venue (Optional)</label><select name="preferredVenueId"><option value="">e.g. Text</option>${venues.map((v) => `<option value="${v.id}" ${u.preferredVenueId === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select><div class="err"></div></div>
      <div class="form-footer"><button class="btn primary" data-save disabled style="width:auto;padding:12px 32px">Save changes</button></div>
    </div></div>`;
    const saveBtn = bodyEl.querySelector("[data-save]");
    const snap0 = bodyEl.querySelector("[name=fullName]").value + bodyEl.querySelector("[name=mobileNumber]").value + bodyEl.querySelector("[name=dateOfBirth]").value;
    bodyEl.querySelectorAll("input,select").forEach((i) => i.addEventListener("input", () => {
      const s = bodyEl.querySelector("[name=fullName]").value + bodyEl.querySelector("[name=mobileNumber]").value + bodyEl.querySelector("[name=dateOfBirth]").value;
      saveBtn.disabled = s === snap0;
    }));
    saveBtn.onclick = async (e) => {
      const btn = e.currentTarget;
      setLoading(btn, true, "Saving...");
      const fd = new FormData();
      fd.append("fullName", bodyEl.querySelector("[name=fullName]").value.trim());
      fd.append("mobileNumber", bodyEl.querySelector("[name=mobileNumber]").value.trim());
      fd.append("dateOfBirth", bodyEl.querySelector("[name=dateOfBirth]").value);
      const pv = bodyEl.querySelector("[name=preferredVenueId]").value;
      if (pv) fd.append("preferredVenueId", pv);
      try {
        const res = await apiFetch("/profile", { method: "PUT", auth: true, formData: fd });
        store.setUser(res.data);
        toast("Profile saved");
        const { renderNav } = await import("../app.js");
        renderNav(); drawBanner(); drawInfo();
      } catch (err) {
        const fe = fieldErrors(err);
        if (fe) for (const [k, msgs] of Object.entries(fe)) {
          const inp = bodyEl.querySelector(`[name=${k}]`);
          if (inp) inp.parentElement.querySelector(".err").textContent = msgs.join(", ");
        }
        else toast(err.message);
      } finally { setLoading(btn, false); }
    };
  }

  async function drawTickets(sub = "upcoming") {
    bodyEl.innerHTML = `<div class="ticket-subtabs"><button class="${sub === "upcoming" ? "active" : ""}" data-sub="upcoming">Upcoming <span data-up></span></button><button class="${sub === "past" ? "active" : ""}" data-sub="past">Past <span data-past></span></button></div><div data-t></div>`;
    const tEl = bodyEl.querySelector("[data-t]");
    bodyEl.querySelectorAll("[data-sub]").forEach((b) => b.onclick = () => drawTickets(b.dataset.sub));
    tEl.innerHTML = `<div class="skeleton"></div>`;
    try {
      const [up, past] = await Promise.all([
        apiFetch(`/tickets?filter=upcoming`, { auth: true }).catch(() => ({ data: [] })),
        apiFetch(`/tickets?filter=past`, { auth: true }).catch(() => ({ data: [] })),
      ]);
      const upCount = (up.data || []).length;
      const pastCount = (past.data || []).length;
      const upEl = bodyEl.querySelector("[data-up]"); if (upEl) upEl.textContent = upCount;
      const pEl = bodyEl.querySelector("[data-past]"); if (pEl) pEl.textContent = pastCount;
      const cnt = root.querySelector("[data-count]"); if (cnt) cnt.textContent = upCount;
      const res = sub === "upcoming" ? up : past;
      const orders = res.data || [];
      if (!orders.length) { tEl.innerHTML = `<div class="empty">${sub === "upcoming" ? "No upcoming tickets." : "No past tickets."}</div>`; return; }
      tEl.innerHTML = "";
      for (const o of orders) {
        const seatBadges = (o.tickets || []).map((t) => `<span class="seat-badge">${esc(t.seatCode)} · ${esc(t.ticketType?.name || "")}</span>`).join("");
        const card = el(`<div class="order-card"><img src="${esc(o.session?.movie?.posterUrl || "")}" />
          <div class="order-main"><div class="order-title">${esc((o.session?.movie?.title || "").toUpperCase())} <span class="badge red">${esc(o.session?.movie?.ageRating?.code || "12+")}</span> <span class="meta">${o.session?.movie?.runtimeMinutes || 134} min</span></div>
          <div class="order-cols"><div><span class="overline">Date</span><b>${esc(o.session?.date || "")} · ${esc(o.session?.startTime || "")}</b></div>
          <div><span class="overline">Venue</span><b>${esc(o.session?.venue?.name || "")} · Hall ${esc(o.session?.hall || "B")}</b></div>
          <div><span class="overline">Format</span><b>${esc(o.session?.format?.name || "MAX")} · ${esc(o.session?.language?.name || "Original + Subtitles")}</b></div></div>
          <div class="order-seats"><span class="overline">Seats</span><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${seatBadges}</div></div></div>
          <div class="order-side"><span class="overline">Order<br/>#${esc(o.reference)}</span><div class="order-total"><span class="meta">Total paid</span><b>₾${o.totalPrice}</b></div>
          ${sub === "upcoming" ? `<button class="btn ${o.isRefundable ? "ghost" : ""}" data-rf ${o.isRefundable ? "" : "disabled"}>Refund</button><div class="meta">${o.isRefundable ? "Refundable until 2h before" : "Not refundable"}</div>` : ""}</div></div>`);
        if (sub === "upcoming" && o.isRefundable) card.querySelector("[data-rf]").onclick = async (e) => {
          if (!confirm("Refund this order?")) return;
          e.currentTarget.disabled = true;
          try { await apiFetch(`/orders/${o.reference}/refund`, { method: "POST", auth: true }); toast("Refunded"); drawTickets(sub); }
          catch (err) { toast(err.payload?.message || err.message); e.currentTarget.disabled = false; }
        };
        tEl.appendChild(card);
      }
    } catch (e) { tEl.innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
  }

  tabs.forEach((b) => b.onclick = () => {
    tabs.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    tab = b.dataset.tab;
    if (tab === "info") drawInfo(); else drawTickets("upcoming");
  });
  const { renderNav } = await import("../app.js");
  drawBanner(); drawInfo();
}
