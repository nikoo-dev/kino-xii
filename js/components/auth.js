import { apiFetch, setToken, setPendingAction, consumePendingAction, fieldErrors } from "../api.js";
import { store } from "../store.js";
import { el, toast } from "../utils.js";
import { openModal, setLoading } from "./modal.js";

function emailValid(v) {
  if (!v) return "Email is required";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "Please enter a valid email";
  return "";
}
function passValid(v) {
  if (!v) return "Password is required";
  if (v.length < 3) return "Password must be at least 3 characters";
  return "";
}

export function openLoginModal(pending = null) {
  if (pending) setPendingAction(pending);
  const box = el(`<div>
    <div style="display:flex;justify-content:space-between;align-items:start"><div><h2>Log in</h2><div class="sub">Welcome back to Kino XII</div></div><button class="link" data-close style="color:#fff;font-size:20px">✕</button></div>
    <div class="field"><label>Email</label><input name="email" type="email" placeholder="example@gmail.com" /><div class="err"></div></div>
    <div class="field"><label>Password</label><input name="password" type="password" placeholder="••••••••" /><div class="err"></div></div>
    <div class="err" data-server style="margin:8px 0"></div>
    <div class="form-footer"><button class="btn primary" data-submit>Log in</button>
      <div class="meta" style="width:100%;text-align:center">Don't have an account? <button class="link" data-switch>Sign up</button></div>
    </div>
  </div>`);
  const { close } = openModal(box);
  const email = box.querySelector('[name=email]');
  const pass = box.querySelector('[name=password]');
  const serverErr = box.querySelector('[data-server]');
  box.querySelector("[data-switch]").onclick = () => { close(); openRegisterModal(); };
  box.querySelector("[data-submit]").onclick = async (e) => {
    const btn = e.currentTarget;
    if (emailValid(email.value) || passValid(pass.value)) {
      serverErr.textContent = emailValid(email.value) || passValid(pass.value);
      email.classList.add("invalid"); pass.classList.add("invalid");
      return;
    }
    setLoading(btn, true);
    serverErr.textContent = "";
    try {
      const res = await apiFetch("/login", { method: "POST", body: { email: email.value.trim(), password: pass.value } });
      setToken(res.data.token);
      store.setUser(res.data.user);
      toast("Logged in");
      close();
      replayPending();
    } catch (err) {
      if (err.status === 401) serverErr.textContent = err.payload?.message || "Invalid credentials.";
      else if (err.status === 422 && fieldErrors(err)) serverErr.textContent = Object.values(fieldErrors(err)).flat().join(" ");
      else serverErr.textContent = err.message;
    } finally { setLoading(btn, false); }
  };
}

export function openRegisterModal() {
  const box = el(`<div>
    <div style="display:flex;justify-content:space-between;align-items:start"><div><h2>Sign up</h2><div class="sub">Welcome to Kino XII</div></div><button class="link" data-close style="color:#fff;font-size:20px">✕</button></div>
    <div class="avatar-upload"><div class="avatar-box">⇪</div><div><b>Upload avatar (optional)</b><div class="meta">JPG, PNG or WEBP</div></div><input name="avatar" type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" /></div>
    <div class="field"><label>Username</label><input name="username" placeholder="User" /><div class="err"></div></div>
    <div class="field"><label>Email</label><input name="email" type="email" placeholder="example@gmail.com" /><div class="err"></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="field"><label>Password</label><input name="password" type="password" placeholder="••••••••" /><div class="err"></div></div>
      <div class="field"><label>Confirm password</label><input name="confirm" type="password" placeholder="••••••••" /><div class="err"></div></div>
    </div>
    <div class="err" data-server></div>
    <div class="form-footer"><button class="btn primary" data-submit>Sign up</button>
      <div class="meta" style="width:100%;text-align:center">Already have an account? <button class="link" data-switch>Log in</button></div>
    </div>
  </div>`);
  const { close } = openModal(box);
  const q = (n) => box.querySelector(`[name=${n}]`);
  const serverErr = box.querySelector("[data-server]");
  box.querySelector(".avatar-upload").onclick = () => q("avatar").click();
  q("avatar").addEventListener("change", () => {
    const f = q("avatar").files[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { serverErr.textContent = "Invalid format. Use jpg, png, WebP."; return; }
    box.querySelector(".avatar-box").textContent = "✓";
  });
  box.querySelector("[data-switch]").onclick = () => { close(); openLoginModal(); };
  box.querySelector("[data-submit]").onclick = async (e) => {
    const btn = e.currentTarget;
    const username = q("username").value.trim();
    const email = q("email").value.trim();
    const password = q("password").value;
    const confirm = q("confirm").value;
    if (!username || username.length < 3) { serverErr.textContent = "Username must be at least 3 characters"; return; }
    if (emailValid(email)) { serverErr.textContent = emailValid(email); return; }
    if (passValid(password)) { serverErr.textContent = passValid(password); return; }
    if (confirm !== password) { serverErr.textContent = "Passwords must match"; return; }
    const fd = new FormData();
    fd.append("username", username); fd.append("email", email);
    fd.append("password", password); fd.append("password_confirmation", confirm);
    const av = q("avatar").files[0];
    if (av) fd.append("avatar", av);
    setLoading(btn, true);
    serverErr.textContent = "";
    try {
      const res = await apiFetch("/register", { method: "POST", formData: fd });
      setToken(res.data.token);
      store.setUser(res.data.user);
      toast("Account created");
      close();
      const pending = consumePendingAction();
      if (pending?.type === "openBooking") {
        if (!res.data.user.profileComplete) { toast("Please complete your profile to enable booking."); location.hash = "#/profile"; }
        else { const { openBookingModal } = await import("./booking.js"); openBookingModal(pending.sessionId); }
      } else if (pending) replayPending(pending);
    } catch (err) {
      const fe = fieldErrors(err);
      serverErr.textContent = fe ? Object.entries(fe).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ") : (err.payload?.message || err.message);
    } finally { setLoading(btn, false); }
  };
}

async function replayPending(provided = null) {
  const pending = provided || consumePendingAction();
  if (!pending) return;
  if (pending.type === "openBooking") {
    const { openBookingModal } = await import("./booking.js");
    openBookingModal(pending.sessionId);
  } else if (pending.type === "goProfile") location.hash = "#/profile";
  else if (pending.type === "notify" && pending.slug) {
    try { await apiFetch(`/movies/${pending.slug}/notify`, { method: "POST", auth: true }); toast("Subscribed."); }
    catch (e) { toast(e.message); }
  }
}

export function requireAuthOrModal(pending) {
  if (store.user) return true;
  openLoginModal(pending || { type: "goProfile" });
  return false;
}
