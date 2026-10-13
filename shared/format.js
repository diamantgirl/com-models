export function formatINR(value, { withSymbol = true } = {}) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  const sign = safe < 0 ? "\u2212" : "";
  return `${sign}${withSymbol ? "\u20B9" : ""}${formatted}`;
}

export function formatSignedINR(value) {
  const n = Number(value) || 0;
  const sign = n > 0 ? "+" : n < 0 ? "\u2212" : "";
  return `${sign}${formatINR(Math.abs(n))}`;
}
