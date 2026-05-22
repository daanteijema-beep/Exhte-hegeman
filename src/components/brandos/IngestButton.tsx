"use client";

import { useState } from "react";

export function IngestButton({ endpoint }: { endpoint: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">(
    "idle"
  );
  const [msg, setMsg] = useState<string | null>(null);

  async function trigger() {
    setState("loading");
    setMsg(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("err");
        setMsg(data?.error ?? `HTTP ${res.status}`);
      } else {
        setState("ok");
        setMsg(
          data?.rows_upserted !== undefined
            ? `${data.rows_upserted} rows`
            : "klaar"
        );
      }
    } catch (e) {
      setState("err");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={trigger}
        disabled={state === "loading"}
        className={[
          "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50",
          state === "ok"
            ? "border-positive/30 bg-positive/10 text-positive"
            : state === "err"
              ? "border-negative/30 bg-negative/10 text-negative"
              : "border-border bg-card-hover text-text-dim hover:border-accent/40 hover:text-accent",
        ].join(" ")}
      >
        {state === "loading"
          ? "bezig…"
          : state === "ok"
            ? "✓ klaar"
            : state === "err"
              ? "✗ error"
              : "Trigger"}
      </button>
      {msg && (
        <span className="font-mono text-[10px] text-text-muted">{msg}</span>
      )}
    </div>
  );
}
