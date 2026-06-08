import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function run() {
  console.log("Fetching PostgREST OpenAPI schema...");
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });

  const schema = await response.json();
  const servicesSchema = schema.definitions?.services;
  if (servicesSchema) {
    console.log("Services schema properties:", JSON.stringify(servicesSchema.properties, null, 2));
  } else {
    console.log("Services schema not found in definitions. Available definitions:", Object.keys(schema.definitions || {}));
  }
}

run();
