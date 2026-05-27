import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Paid users
const { data: users, error: usersError } = await supabase
  .from("users")
  .select("id, email, full_name, year, semester, created_at")
  .eq("is_paid", true)
  .order("created_at", { ascending: false });

if (usersError) { console.error(usersError.message); process.exit(1); }

const ids = users.map((u) => u.id);

// 2. User stats (sessions, time, papers)
const { data: stats } = await supabase
  .from("user_stats")
  .select("user_id, session_count, total_time_spent_seconds, total_unique_papers")
  .in("user_id", ids);

const statsMap = new Map((stats ?? []).map((s) => [s.user_id, s]));

// 3. Paper views — count per user and most recent paper viewed
const { data: views } = await supabase
  .from("user_paper_views")
  .select("user_id, name, count, last_viewed_at")
  .in("user_id", ids)
  .order("last_viewed_at", { ascending: false });

const viewsMap = new Map();
for (const v of views ?? []) {
  if (!viewsMap.has(v.user_id)) viewsMap.set(v.user_id, []);
  viewsMap.get(v.user_id).push(v);
}

// 4. Payment transactions — phone number, amount, payer name from ai_payload
const { data: txns } = await supabase
  .from("payment_transactions")
  .select("user_id, status, created_at, ai_payload, transaction_id")
  .in("user_id", ids)
  .order("created_at", { ascending: false });

const txnMap = new Map();
for (const t of txns ?? []) {
  if (!txnMap.has(t.user_id)) txnMap.set(t.user_id, t); // keep latest
}

// 5. Build rows
const escape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const fmtMins = (secs) => secs ? Math.round(secs / 60) : 0;

const header = [
  "name", "email", "phone", "year", "semester", "joined_at",
  "sessions", "total_time_mins", "unique_papers_viewed",
  "payment_status", "payment_amount", "payment_date",
  "most_recent_paper", "papers_viewed_list",
];

const rows = users.map((u) => {
  const s = statsMap.get(u.id) ?? {};
  const userViews = viewsMap.get(u.id) ?? [];
  const t = txnMap.get(u.id);
  const payload = t?.ai_payload ?? {};
  const phone = payload.submittedPhoneNumber ?? payload.phoneNumber ?? "";
  const amount = payload.amount != null ? `₹${payload.amount}` : "";
  const mostRecent = userViews[0]?.name ?? "";
  const papersList = userViews.map((v) => `${v.name}(x${v.count})`).join(" | ");

  return [
    escape(u.full_name),
    escape(u.email),
    escape(phone),
    escape(u.year),
    escape(u.semester),
    escape(u.created_at?.slice(0, 10)),
    escape(s.session_count ?? ""),
    escape(fmtMins(s.total_time_spent_seconds)),
    escape(s.total_unique_papers ?? ""),
    escape(t?.status ?? ""),
    escape(amount),
    escape(t?.created_at?.slice(0, 10) ?? ""),
    escape(mostRecent),
    escape(papersList),
  ];
});

const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
const outPath = join(__dirname, "../contact.csv");
writeFileSync(outPath, csv, "utf-8");

console.log(`Exported ${users.length} paid user(s) → contact.csv`);

// Quick summary to stdout
console.log("\nQuick look:");
for (const u of users.slice(0, 5)) {
  const s = statsMap.get(u.id) ?? {};
  const t = txnMap.get(u.id);
  const phone = t?.ai_payload?.submittedPhoneNumber ?? t?.ai_payload?.phoneNumber ?? "—";
  console.log(`  ${u.full_name} | ${u.email} | phone: ${phone} | sessions: ${s.session_count ?? 0} | papers: ${s.total_unique_papers ?? 0}`);
}
if (users.length > 5) console.log(`  ... and ${users.length - 5} more`);
