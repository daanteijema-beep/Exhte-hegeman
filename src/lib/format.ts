export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("nl-NL").format(n);
}

export function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "–";
  return `${n.toFixed(digits)}%`;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function fmtRelative(d: string | Date | null | undefined): string {
  if (!d) return "nooit";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min}m geleden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}u geleden`;
  const d2 = Math.floor(hr / 24);
  if (d2 < 30) return `${d2}d geleden`;
  return fmtDate(date);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
