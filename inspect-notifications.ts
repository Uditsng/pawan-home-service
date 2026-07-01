import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to inspect all tokens
);

async function run() {
  console.log("=== Notification Diagnostic Info ===");

  // 1. Check profiles count by role
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, role");
  if (pErr) {
    console.error("Error reading profiles:", pErr);
    return;
  }
  console.log(`Total profiles: ${profiles?.length || 0}`);
  const partners = profiles?.filter(p => p.role === 'partner') || [];
  console.log(`Total partners: ${partners.length}`);
  partners.forEach(p => {
    console.log(`  - Partner ID: ${p.id}, Name: ${p.full_name}, Email: ${p.email}`);
  });

  // 2. Check notification_tokens
  const { data: tokens, error: tErr } = await supabase
    .from("notification_tokens")
    .select("*");
  if (tErr) {
    console.error("Error reading notification_tokens:", tErr);
  } else {
    console.log(`\nTotal notification_tokens: ${tokens?.length || 0}`);
    tokens?.forEach(t => {
      const user = profiles?.find(p => p.id === t.user_id);
      console.log(`  - Token ID: ${t.id}, User: ${user?.full_name || 'Unknown'} (${user?.role || 'No Role'}), Platform: ${t.platform}, Last Seen: ${t.last_seen}`);
    });
  }

  // 3. Check device_tokens
  const { data: dTokens, error: dErr } = await supabase
    .from("device_tokens")
    .select("*");
  if (dErr) {
    console.error("Error reading device_tokens:", dErr);
  } else {
    console.log(`\nTotal device_tokens: ${dTokens?.length || 0}`);
    dTokens?.forEach(t => {
      const user = profiles?.find(p => p.id === t.user_id);
      console.log(`  - Device Token ID: ${t.id}, User: ${user?.full_name || 'Unknown'}, Platform: ${t.platform}`);
    });
  }

  // 4. Check recent notifications and delivery status
  const { data: notifs, error: nErr } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (nErr) {
    console.error("Error reading recent notifications:", nErr);
  } else {
    console.log(`\nRecent 10 notifications:`);
    notifs?.forEach(n => {
      const user = profiles?.find(p => p.id === n.user_id);
      console.log(`  - [${n.created_at}] User: ${user?.full_name || 'Unknown'} (${user?.role || 'No Role'}), Title: "${n.title}", Type: ${n.type}, Delivery Status: ${n.delivery_status || 'null'}`);
    });
  }
}

run();
