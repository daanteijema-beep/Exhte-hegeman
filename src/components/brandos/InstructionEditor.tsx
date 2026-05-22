"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { Badge } from "./Badge";
import type { AgentInstruction } from "@/lib/supabase/types";

export function InstructionEditor({
  instructions: initial,
}: {
  instructions: AgentInstruction[];
}) {
  const [items, setItems] = useState(initial);

  async function save(id: number, instruction: string) {
    const { error } = await supabaseClient
      .from("agent_instructions")
      .update({ instruction, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Card key={it.id} item={it} onSave={save} onLocalChange={(v) =>
          setItems(items.map(i => i.id === it.id ? {...i, instruction: v} : i))
        } />
      ))}
    </div>
  );
}

function Card({
  item,
  onSave,
  onLocalChange,
}: {
  item: AgentInstruction;
  onSave: (id: number, v: string) => void | Promise<void>;
  onLocalChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="font-display font-semibold">{item.title}</p>
        <Badge variant="ghost">{item.scope}</Badge>
        {!item.active && <Badge variant="warning">inactive</Badge>}
      </div>
      {editing ? (
        <>
          <textarea
            value={item.instruction}
            onChange={(e) => onLocalChange(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border bg-bg p-3 font-mono text-xs text-text"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                setSaving(true);
                await onSave(item.id, item.instruction);
                setSaving(false);
                setEditing(false);
              }}
              disabled={saving}
              className="rounded-full bg-accent px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white hover:bg-accent/80 disabled:opacity-50"
            >
              {saving ? "saving…" : "Opslaan"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-text-dim hover:text-text"
            >
              Annuleer
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="block w-full text-left text-sm text-text-dim hover:text-text"
        >
          {item.instruction}
        </button>
      )}
    </div>
  );
}
