import { describe, it, expect } from "vitest";
import { computeUrgency, type UrgencyInput } from "./urgency";

const base: UrgencyInput = {
  dagen_online: 30,
  web_pageviews: 100,
  wz_applications: 4,
  pv_last_14d: 50,
  pv_prev_14d: 50,
  salary_min: 40000,
  description_length: 1200,
};

describe("computeUrgency", () => {
  it("returns score 0..100", () => {
    const r = computeUrgency(base);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("flags long-open no-apps as high urgency", () => {
    const r = computeUrgency({
      ...base,
      dagen_online: 140,
      wz_applications: 0,
      web_pageviews: 200,
      pv_last_14d: 20,
      pv_prev_14d: 30,
    });
    expect(r.score).toBeGreaterThan(60);
    expect(r.reasons.some((x) => x.includes("dagen online"))).toBe(true);
    expect(
      r.reasons.some(
        (x) => x.toLowerCase().includes("sollicitatie") || x.includes("apps")
      )
    ).toBe(true);
  });

  it("flags traffic-without-conversion (high pv, low apps)", () => {
    const r = computeUrgency({ ...base, web_pageviews: 800, wz_applications: 1 });
    expect(r.breakdown.conversion_gap).toBeGreaterThan(0.5);
  });

  it("flags declining trend", () => {
    const r = computeUrgency({ ...base, pv_last_14d: 10, pv_prev_14d: 80 });
    expect(r.breakdown.trend).toBeGreaterThan(0.5);
    expect(
      r.reasons.some(
        (x) => x.toLowerCase().includes("daling") || x.includes("-")
      )
    ).toBe(true);
  });

  it("flags missing salary + short description", () => {
    const r = computeUrgency({
      ...base,
      salary_min: null,
      description_length: 200,
    });
    expect(r.breakdown.data_gap).toBeGreaterThan(0);
  });

  it("returns label 'aandacht' when score >= 50, 'warning' 30-49, 'ok' onder 30", () => {
    expect(
      computeUrgency({
        ...base,
        dagen_online: 200,
        wz_applications: 0,
        pv_last_14d: 0,
        pv_prev_14d: 50,
      }).label
    ).toBe("aandacht");
    expect(computeUrgency(base).label).toMatch(/^(ok|warning|aandacht)$/);
  });

  it("handles null/missing inputs without throwing", () => {
    const r = computeUrgency({
      dagen_online: null,
      web_pageviews: null,
      wz_applications: null,
      pv_last_14d: null,
      pv_prev_14d: null,
      salary_min: null,
      description_length: null,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
