import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.rpc("get_table_columns", { table_name: "services" });
  
  // If there's no get_table_columns RPC, we can query information_schema via a postgrest select if possible,
  // or we can query any random row and see what keys are in the raw json, or use a custom query.
  // Wait, let's just fetch one row from services but select everything raw.
  const { data: rawRow, error: rawError } = await supabase
    .from("services")
    .select("*")
    .limit(1);

  if (rawError) {
    console.error("rawError:", rawError);
  } else {
    console.log("Raw Row keys:", Object.keys(rawRow[0] || {}));
    console.log("Raw Row data:", rawRow[0]);
  }
}

run();
