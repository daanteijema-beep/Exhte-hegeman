import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8096;
const MCP_BETA = "mcp-client-2025-04-04";

export type AgentName =
  | "concurrent_discover"
  | "concurrent_analyse"
  | "markt"
  | "analyse";
export type RunTrigger = "manual" | "cron" | "api";

export interface RunResult {
  ok: boolean;
  run_id: string;
  agent: AgentName;
  duration_ms: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  stop_reason: string | null;
  tool_use_count: number;
  tools_used: string[];
  insights_written: number;
  final_text: string;
  error?: string;
}

async function countInsights(): Promise<number> {
  const { count } = await supabaseServer
    .from("brandos_insights")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function runAgent(args: {
  agent: AgentName;
  systemPrompt: string;
  userMessage: string;
  trigger: RunTrigger;
}): Promise<RunResult> {
  const { agent, systemPrompt, userMessage, trigger } = args;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!supabaseAccessToken) {
    console.warn(
      `[${agent}] SUPABASE_ACCESS_TOKEN niet gezet — agent draait zonder Supabase MCP connector`
    );
  }

  const insightsBefore = await countInsights();

  const { data: runRow, error: runErr } = await supabaseServer
    .from("brandos_agent_runs")
    .insert({
      trigger,
      status: "running",
      agents_run: [agent],
    })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runRow.id as string;
  const startedAt = Date.now();

  const client = new Anthropic({ apiKey });

  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: string | null = null;
  let toolUseCount = 0;
  const toolsUsed = new Set<string>();
  let finalText = "";

  try {
    // MCP + web search via beta. Types in oudere SDK-versies kennen
    // `mcp_servers` / `betas` nog niet — cast op het params-object.
    const params = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      betas: [MCP_BETA],
      system: systemPrompt,
      messages: [{ role: "user" as const, content: userMessage }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      ...(supabaseAccessToken
        ? {
            mcp_servers: [
              {
                type: "url",
                url: "https://mcp.supabase.com/mcp",
                name: "supabase",
                authorization_token: supabaseAccessToken,
              },
            ],
          }
        : {}),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (client as any).beta.messages.stream(params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const event of stream as AsyncIterable<any>) {
      if (
        event?.type === "content_block_start" &&
        event.content_block?.type === "tool_use"
      ) {
        toolUseCount++;
        const name: string = event.content_block.name ?? "unknown";
        toolsUsed.add(name);
        console.log(`[${agent}] tool_use #${toolUseCount}: ${name}`);
      }
      if (event?.type === "content_block_start" && event.content_block?.type === "server_tool_use") {
        toolUseCount++;
        const name: string = event.content_block.name ?? "server_tool";
        toolsUsed.add(name);
        console.log(`[${agent}] server_tool_use #${toolUseCount}: ${name}`);
      }
    }

    const finalMsg = await stream.finalMessage();
    inputTokens = finalMsg.usage?.input_tokens ?? 0;
    outputTokens = finalMsg.usage?.output_tokens ?? 0;
    stopReason = finalMsg.stop_reason ?? null;
    finalText = finalMsg.content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text)
      .join("\n");

    const insightsAfter = await countInsights();
    const insightsWritten = Math.max(0, insightsAfter - insightsBefore);

    await supabaseServer
      .from("brandos_agent_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        total_tokens: inputTokens + outputTokens,
        insights_written: insightsWritten,
      })
      .eq("id", runId);

    return {
      ok: true,
      run_id: runId,
      agent,
      duration_ms: Date.now() - startedAt,
      tokens: inputTokens + outputTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      stop_reason: stopReason,
      tool_use_count: toolUseCount,
      tools_used: Array.from(toolsUsed),
      insights_written: insightsWritten,
      final_text: finalText,
    };
  } catch (e) {
    const errMsg = (e as Error).message;
    console.error(`[${agent}] agent error:`, errMsg);

    const insightsAfter = await countInsights();
    const insightsWritten = Math.max(0, insightsAfter - insightsBefore);

    await supabaseServer
      .from("brandos_agent_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: errMsg,
        total_tokens: inputTokens + outputTokens,
        insights_written: insightsWritten,
        agents_failed: [agent],
      })
      .eq("id", runId);

    return {
      ok: false,
      run_id: runId,
      agent,
      duration_ms: Date.now() - startedAt,
      tokens: inputTokens + outputTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      stop_reason: stopReason,
      tool_use_count: toolUseCount,
      tools_used: Array.from(toolsUsed),
      insights_written: insightsWritten,
      final_text: finalText,
      error: errMsg,
    };
  }
}
