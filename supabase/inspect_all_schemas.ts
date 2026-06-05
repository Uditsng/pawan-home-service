import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const tables = ["profiles", "bookings", "partner_services", "partner_service_areas", "booking_rejections"];
  console.log("Fetching one row from each table to inspect fields:");
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error fetching from ${table}:`, error.message);
    } else {
      console.log(`\nTable: ${table}`);
      if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
        console.log("Sample row:", data[0]);
      } else {
        // Table is empty, let's try querying information_schema.columns if we can
        console.log("Table is empty. Attempting to get columns from information_schema...");
        const { data: cols, error: colsErr } = await supabase
          .from("information_schema.columns")
          .select("column_name, data_type, is_nullable")
          .eq("table_name", table);
        if (colsErr) {
          console.error(`Error querying information_schema for ${table}:`, colsErr.message);
        } else {
          console.log("Columns:", cols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));
        }
      }
    }
  }
}

run();
