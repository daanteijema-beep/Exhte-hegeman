export type UrgencyInput = {
  dagen_online: number | null;
  web_pageviews: number | null;
  wz_applications: number | null;
  pv_last_14d: number | null;
  pv_prev_14d: number | null;
  salary_min: number | null;
  description_length: number | null;
};

export type UrgencyResult = {
  score: number;
  label: "ok" | "warning" | "aandacht";
  reasons: string[];
  breakdown: {
    time_pressure: number;
    conversion_gap: number;
    trend: number;
    data_gap: number;
  };
};

const WEIGHTS = { time: 0.3, conv: 0.35, trend: 0.2, data: 0.15 };
const TARGET_CONVERSION = 0.02;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const safe = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? n : 0;

export function computeUrgency(input: UrgencyInput): UrgencyResult {
  const days = safe(input.dagen_online);
  const pv = safe(input.web_pageviews);
  const apps = safe(input.wz_applications);
  const pvLast = safe(input.pv_last_14d);
  const pvPrev = safe(input.pv_prev_14d);
  const descLen = safe(input.description_length);

  const time_pressure = clamp01(days / 120);

  const target_apps = Math.max(pv * TARGET_CONVERSION, 1);
  const conversion_gap = clamp01(1 - apps / target_apps);

  const trend = pvPrev > 0 ? clamp01((pvPrev - pvLast) / pvPrev) : 0;

  const missing_salary = input.salary_min == null ? 1 : 0;
  const short_desc = descLen > 0 && descLen < 500 ? 1 : 0;
  const data_gap = clamp01((missing_salary + short_desc) / 2);

  const raw =
    WEIGHTS.time * time_pressure +
    WEIGHTS.conv * conversion_gap +
    WEIGHTS.trend * trend +
    WEIGHTS.data * data_gap;
  const score = Math.round(raw * 100);

  const reasons: string[] = [];
  if (time_pressure > 0.5) reasons.push(`${days} dagen online`);
  if (conversion_gap > 0.6 && pv > 30) {
    reasons.push(`${apps} sollicitaties op ${pv} pageviews`);
  }
  if (trend > 0.3) {
    const pct = pvPrev > 0 ? Math.round(((pvLast - pvPrev) / pvPrev) * 100) : 0;
    reasons.push(`pageviews ${pct >= 0 ? "+" : ""}${pct}% afgelopen 14d`);
  }
  if (missing_salary) reasons.push("geen salaris vermeld");
  if (short_desc) reasons.push("korte tekst (<500 chars)");

  const label: UrgencyResult["label"] =
    score >= 50 ? "aandacht" : score >= 30 ? "warning" : "ok";

  return {
    score,
    label,
    reasons,
    breakdown: { time_pressure, conversion_gap, trend, data_gap },
  };
}
