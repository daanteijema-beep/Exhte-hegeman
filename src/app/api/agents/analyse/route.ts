import { NextRequest, NextResponse } from "next/server";
import { requireCronAuthOrPost } from "@/lib/cron";
import { runAgent } from "@/lib/brandos/agents/runner";
import { ANALYSE_SYSTEM_PROMPT } from "@/lib/brandos/agents/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const userMessage =
    `Start volledige data analyse. Datum: ${today}. ` +
    `Haal alle data op via de v_* views, analyseer grondig per stap, ` +
    `bereken de Employer Brand Health Score en schrijf het rapport naar brandos_analysis_reports. ` +
    `Sluit af met de top 5 acties voor deze week als insight.`;

  const result = await runAgent({
    agent: "analyse",
    systemPrompt: ANALYSE_SYSTEM_PROMPT,
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
