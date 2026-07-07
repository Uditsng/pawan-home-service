import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function inspectColumns(tableName: string) {
  console.log(`\n--- COLUMNS FOR ${tableName.toUpperCase()} ---`);
  
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name, data_type, is_nullable")
    .eq("table_name", tableName);

  if (error) {
    console.error(`Error querying schema for ${tableName}:`, error);
  } else {
    console.log(data);
  }
}

async function run() {
  await inspectColumns("reviews");
}

run();
