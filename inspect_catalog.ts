import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  console.log("--- 1. CATEGORIES ---");
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*");
  if (catError) console.error("Error categories:", catError);
  else console.log(categories);

  console.log("\n--- 2. SUBCATEGORIES ---");
  const { data: subcategories, error: subError } = await supabase
    .from("subcategories")
    .select("id, subcategory_name, icon_name, category_id");
  if (subError) console.error("Error subcategories:", subError);
  else console.log(subcategories);

  console.log("\n--- 3. SAMPLE SERVICES ---");
  const { data: services, error: servError } = await supabase
    .from("services")
    .select("id, title, subcategory_id, base_price, is_active, pricing_model, category, slug")
    .limit(5);
  if (servError) console.error("Error services:", servError);
  else console.log(services);

  console.log("\n--- 4. COLUMNS OF SERVICES TABLE ---");
  const { data: columns, error: colErr } = await supabase
    .from("information_schema.columns")
    .select("column_name, data_type, is_nullable, column_default")
    .eq("table_name", "services");
  if (colErr) console.error("Error querying columns:", colErr);
  else {
    columns.forEach(c => {
      console.log(`${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    });
  }

  console.log("\n--- 5. DISTINCT PRICING MODELS ---");
  const { data: models, error: modErr } = await supabase
    .from("services")
    .select("pricing_model");
  if (modErr) console.error("Error pricing models:", modErr);
  else {
    const uniqueModels = Array.from(new Set((models || []).map(m => m.pricing_model)));
    console.log("Distinct pricing models in DB:", uniqueModels);
  }
}

run();
