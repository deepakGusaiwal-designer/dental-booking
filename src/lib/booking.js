/* ------------------------------- phone rules ------------------------------ */

// Indian mobile: 10 digits, first digit 6-9. We store/compare the bare
// 10 digits so "+91 98765 43210" and "098765 43210" are the same person.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isIndianMobile(raw) {
  return INDIAN_MOBILE.test(normalizePhone(raw));
}

export function formatPhone(tenDigits) {
  return tenDigits.length === 10
    ? `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`
    : tenDigits;
}

/* -------------------------------- time slots ------------------------------ */

// Clinic hours: 10:00 AM to 9:00 PM, in 15-minute slots.
export const SLOT_MINUTES = 15;
export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 21;

export const TIME_SLOTS = (() => {
  const slots = [];
  for (let m = OPEN_HOUR * 60; m <= CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    slots.push({ value, label: `${h12}:${String(min).padStart(2, "0")} ${suffix}` });
  }
  return slots;
})();

export function slotLabel(value) {
  return TIME_SLOTS.find((s) => s.value === value)?.label || value;
}
