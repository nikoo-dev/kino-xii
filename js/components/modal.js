import { el } from "./utils.js";

const root = () => document.getElementById("modal-root");

export function openModal(html, { wide = false, onClose } = {}) {
  closeModal();
  const overlay = el(`<div class="modal-overlay"><div class="modal ${wide ? "wide" : ""}"></div></div>`);
  const box = overlay.querySelector(".modal");
  if (typeof html === "string") box.innerHTML = html;
  else box.appendChild(html);

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  box.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", onKey);
  root().appendChild(overlay);
  return { overlay, box, close };
}

export function closeModal() {
  root().innerHTML = "";
}

export function setLoading(btn, loading, text = "Loading...") {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
    btn.disabled = false;
  }
}

// on-blur validation helper: input -> validate fn returns error string or ""
export function attachBlurValidation(input, validate) {
  const show = () => {
    const msg = validate(input.value);
    const errEl = input.parentElement.querySelector(".err");
    if (!msg) {
      input.classList.remove("invalid");
      input.classList.add("valid");
      if (errEl) errEl.textContent = "";
    } else {
      input.classList.remove("valid");
      input.classList.add("invalid");
      if (errEl) errEl.textContent = msg;
    }
    return msg;
  };
  input.addEventListener("blur", show);
  return show;
}
