"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  tabs,
}: {
  tabs: { key: string; label: string; count?: number; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={[
                "relative -mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-accent text-text"
                  : "border-transparent text-text-dim hover:text-text",
              ].join(" ")}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={[
                    "ml-2 rounded-full px-2 py-0.5 font-mono text-[10px]",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "bg-card-hover text-text-dim",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {current?.content}
    </div>
  );
}
