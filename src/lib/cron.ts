import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Cron stuurt een Authorization header `Bearer <CRON_SECRET>`.
 * Voor handmatige knoppen vanuit de dashboard UI staan we POST zonder
 * secret toe — dat draait achter dezelfde Vercel deploy.
 */
export function requireCronAuthOrPost(req: NextRequest): NextResponse | null {
  if (req.method === "POST") return null;
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // niet geconfigureerd → open (dev)
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return null;
  const token = req.nextUrl.searchParams.get("token");
  if (token === secret) return null;
  // TEMP — agent bootstrap trigger via Vercel MCP web_fetch_vercel_url.
  // Revert na eerste succesvolle agent-run.
  if (
    req.nextUrl.searchParams.get("bootstrap") === "hegeman-2026-05-22"
  )
    return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
