// One-off: vult brandos_vacancies.description voor alle Recruitee-offers
// door per-offer-detail fetch + HTML strip. Idempotent: re-run is veilig.
// Gebruik: node scripts/backfill-recruitee-descriptions.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// .env.local laden (KEY=value regels, quoted of niet)
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [k, v];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = env.RECRUITEE_API_TOKEN;
const COMPANY = env.RECRUITEE_COMPANY_ID;
if (!SUPABASE_URL || !SERVICE_KEY || !TOKEN || !COMPANY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const base = `https://api.recruitee.com/c/${COMPANY}`;
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" };

console.log("1/4 offers list ophalen...");
const listRes = await fetch(`${base}/offers?scope=default,archived&limit=200`, { headers });
if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
const offers = (await listRes.json()).offers || [];
console.log(`   ${offers.length} offers gevonden`);

console.log("2/4 per-offer detail fetchen...");
const details = [];
let okCount = 0, failCount = 0;
for (const o of offers) {
  try {
    const r = await fetch(`${base}/offers/${o.id}`, { headers });
    if (!r.ok) { failCount++; continue; }
    const d = (await r.json()).offer;
    const html = d?.description ?? d?.description_html ?? "";
    const text = htmlToText(html);
    if (text.length > 0) {
      details.push({ id: o.id, text: text.slice(0, 5000) });
      okCount++;
    } else {
      failCount++;
    }
  } catch (e) {
    failCount++;
  }
}
console.log(`   ${okCount} OK, ${failCount} fail`);

console.log("3/4 DB-IDs opzoeken (prefix check)...");
const { data: existing } = await supa
  .from("brandos_vacancies")
  .select("id, external_id")
  .eq("origin", "recruitee");
const idByExternal = new Map((existing ?? []).map((r) => [r.external_id, r.id]));
console.log(`   ${idByExternal.size} bestaande Recruitee-rijen in DB`);

console.log("4/4 description UPDATEn...");
let updated = 0, skipped = 0;
for (const d of details) {
  const dbId = idByExternal.get(String(d.id));
  if (!dbId) { skipped++; continue; }
  const { error } = await supa
    .from("brandos_vacancies")
    .update({ description: d.text })
    .eq("id", dbId);
  if (error) { console.error(`   update fail ${dbId}: ${error.message}`); }
  else updated++;
}
console.log(`   ${updated} updated, ${skipped} no-match`);

// Verify via view
console.log("\nVerificatie via v_vacatures_with_urgency:");
const { data: verify } = await supa
  .from("v_vacatures_with_urgency")
  .select("id, title, description_length")
  .order("description_length", { ascending: false })
  .limit(5);
verify?.forEach((v) => console.log(`   ${v.id}  ${v.description_length} chars  ${v.title}`));
