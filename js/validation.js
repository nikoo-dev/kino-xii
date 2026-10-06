// Shared client-side validators. Messages mirror the API's exact strings
// where the spec fixes them, so client and server agree.
export function emailError(v) {
  v = (v || "").trim();
  if (!v) return "Email is required";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "Please enter a valid email";
  return "";
}
export function passwordError(v) {
  if (!v) return "Password is required";
  if (v.length < 3) return "Password must be at least 3 characters";
  return "";
}
export function usernameError(v) {
  v = (v || "").trim();
  if (!v) return "Username is required";
  if (v.length < 3) return "Username must be at least 3 characters";
  return "";
}
export function fullNameError(v) {
  v = (v || "").trim();
  if (!v) return "Name is required";
  if (v.length < 3) return "Name must be at least 3 characters";
  if (v.length > 50) return "Name must not exceed 50 characters";
  return "";
}
export function mobileError(v) {
  const d = String(v || "").replace(/\s+/g, "");
  if (!d) return "Mobile number is required";
  if (!/^5/.test(d)) return "Georgian mobile numbers must start with 5";
  if (!/^\d+$/.test(d) || d.length !== 9)
    return d.length !== 9
      ? "Mobile number must be exactly 9 digits"
      : "Please enter a valid Georgian mobile number (9 digits starting with 5)";
  return "";
}
export function dobError(v) {
  if (!v) return "Date of birth is required";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "Please enter a valid date of birth";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 12) return "You must be at least 12 years old to create an account";
  return "";
}
export function cardError(v) {
  const d = String(v || "").replace(/\s+/g, "");
  if (!d) return "Card number is required";
  if (!/^\d{16}$/.test(d)) return "Card number must be 16 digits";
  return "";
}
export function expiryError(v) {
  v = (v || "").trim();
  if (!v) return "Expiry is required";
  const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return "Use MM/YY format";
  const yy = 2000 + Number(m[2]);
  const mm = Number(m[1]);
  const now = new Date();
  if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1))
    return "Card expiry must be in the future";
  return "";
}
export function cvvError(v) {
  v = String(v || "").trim();
  if (!v) return "CVV is required";
  if (!/^\d{3}$/.test(v)) return "CVV must be 3 digits";
  return "";
}
