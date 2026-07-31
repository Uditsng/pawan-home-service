import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log("Searching for phone: +918081101045");
  
  // 1. Search profiles
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("phone", "+918081101045");
  console.log("Profiles:", profiles, "Error:", pErr);

  // 2. Search auth.users
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error("Error listing users:", uErr);
  } else {
    const matchedUsers = users.users.filter(u => 
      u.phone === "+918081101045" || 
      u.email?.includes("8081101045") || 
      u.user_metadata?.phone === "+918081101045"
    );
    console.log("Matched Users by phone/metadata:", matchedUsers);
    
    // Sort by created_at descending
    const sortedUsers = users.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    console.log("Last 5 created users:");
    console.log(JSON.stringify(sortedUsers.slice(0, 5).map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      user_metadata: u.user_metadata
    })), null, 2));
  }
}

main();
