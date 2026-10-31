// Display only. The database (numeric(12,2)) is the source of truth for every amount;
// never do money math in JS, ask Postgres (see effective_price in docs/API.md).
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isNaN(n) ? '—' : inr.format(n);
}
