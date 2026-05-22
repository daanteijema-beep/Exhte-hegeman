import { NextRequest, NextResponse } from "next/server";
import { requireCronAuthOrPost } from "@/lib/cron";
import { runAgent } from "@/lib/brandos/agents/runner";
import { CONCURRENT_ANALYSE_SYSTEM_PROMPT } from "@/lib/brandos/agents/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const userMessage =
    `Start concurrent-analyse. Datum: ${today}. ` +
    `Analyseer de competitor vacatures uit brandos_competitor_vacancies die nog ` +
    `geen analyse hebben in brandos_competitor_analysis. Sluit af met een ` +
    `vergelijkend insight + aanbevelingen voor Hegeman.`;

  const result = await runAgent({
    agent: "concurrent_analyse",
    systemPrompt: CONCURRENT_ANALYSE_SYSTEM_PROMPT,
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
