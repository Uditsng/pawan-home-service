import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  console.log("Selecting all columns from services...");
  const { data, error } = await supabase
    .from("services")
    .select("*");
  if (error) {
    console.error("SELECT * error:", error);
  } else {
    console.log("SELECT * succeeded! Length:", data.length);
    if (data.length > 0) {
      console.log("First row keys:", Object.keys(data[0]));
    }
  }
}

run();
