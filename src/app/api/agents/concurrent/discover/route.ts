import { NextRequest, NextResponse } from "next/server";
import { requireCronAuthOrPost } from "@/lib/cron";
import { runAgent } from "@/lib/brandos/agents/runner";
import { CONCURRENT_DISCOVER_SYSTEM_PROMPT } from "@/lib/brandos/agents/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const userMessage =
    `Start concurrent-discover. Datum: ${today}. ` +
    `Begin met de huidige concurrenten in brandos_competitors, vul aan met ` +
    `nieuwe relevante werkgevers via web search, en scrape per concurrent ` +
    `de openstaande vacatures (max 20 per concurrent) naar Supabase.`;

  const result = await runAgent({
    agent: "concurrent_discover",
    systemPrompt: CONCURRENT_DISCOVER_SYSTEM_PROMPT,
    userMessage,
    trigger: "cron",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  return run();
}

export async function GET(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  return run();
}
