"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

type Option = { value: string; count: number };

export function FilterBar({
  departments,
  locations,
  employmentTypes,
}: {
  departments: Option[];
  locations: Option[];
  employmentTypes: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = (k: string) => params.getAll(k);
  const setMulti = useCallback(
    (k: string, vals: string[]) => {
      const p = new URLSearchParams(params.toString());
      p.delete(k);
      vals.forEach((v) => p.append(k, v));
      router.replace(`${pathname}?${p.toString()}`);
    },
    [params, pathname, router]
  );

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
      <Multi label="Afdeling" options={departments} selected={get("dept")} onChange={(v) => setMulti("dept", v)} />
      <Multi label="Locatie" options={locations} selected={get("loc")} onChange={(v) => setMulti("loc", v)} />
      <Multi label="Type" options={employmentTypes} selected={get("emp")} onChange={(v) => setMulti("emp", v)} />
      <input
        type="search"
        placeholder="Zoek titel…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set("q", e.target.value);
          else p.delete("q");
          router.replace(`${pathname}?${p.toString()}`);
        }}
        className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-sm placeholder:text-text-muted"
      />
    </div>
  );
}

function Multi({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full border border-border bg-card px-3 py-1 text-xs">
        <span className="font-mono uppercase tracking-wider text-text-dim">{label}</span>
        {selected.length > 0 && <span className="ml-2 text-accent">· {selected.length}</span>}
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl">
        {options.length === 0 && <p className="px-2 py-1 text-xs text-text-muted">geen</p>}
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs hover:bg-card-hover"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.value}
            </span>
            <span className="font-mono text-text-muted">{o.count}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
