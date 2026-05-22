import { NextRequest, NextResponse } from "next/server";
import { requireCronAuthOrPost } from "@/lib/cron";
import { runAgent } from "@/lib/brandos/agents/runner";
import { MARKT_SYSTEM_PROMPT } from "@/lib/brandos/agents/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const userMessage =
    `Start marktonderzoek voor Hegeman Bouw & Infra. Datum: ${today}. ` +
    `Werk alle 6 onderzoeksgebieden grondig door en schrijf elk resultaat naar brandos_market_research.`;

  const result = await runAgent({
    agent: "markt",
    systemPrompt: MARKT_SYSTEM_PROMPT,
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
