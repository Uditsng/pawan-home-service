import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

import * as fs from "fs";
import * as path from "path";

async function run() {
  console.log("Running diagnostic inserts on bookings table...");
  
  // 1. Fetch a service and customer to use as valid foreign keys
  const { data: services } = await supabase.from("services").select("id").limit(1);
  const { data: customers } = await supabase.from("profiles").select("id").eq("role", "customer").limit(1);
  
  if (!services || services.length === 0 || !customers || customers.length === 0) {
    console.log("Cannot run diagnostic: missing service or customer profiles.");
    return;
  }
  
  const serviceId = services[0].id;
  const customerId = customers[0].id;
  
  // Let's try inserting with basic columns first
  const baseBooking = {
    service_id: serviceId,
    customer_id: customerId,
    status: 'pending',
    total_amount: 100,
    city: 'Roorkee',
    scheduled_date: new Date().toISOString()
  };

  console.log("Trying basic insert...");
  const { data: bData, error: bErr } = await supabase.from("bookings").insert(baseBooking).select();
  if (bErr) {
    console.log("Basic insert failed:", bErr);
  } else {
    console.log("Basic insert succeeded! ID:", bData[0].id);
    // Delete the test row
    await supabase.from("bookings").delete().eq("id", bData[0].id);
  }

  // Try with phone
  console.log("Trying insert with phone...");
  const { error: phoneErr } = await supabase.from("bookings").insert({ ...baseBooking, phone: "12345" }).select();
  console.log("Insert with phone error:", phoneErr?.message || "No error");

  // Try with pincode
  console.log("Trying insert with pincode...");
  const { error: pinErr } = await supabase.from("bookings").insert({ ...baseBooking, pincode: "12345" }).select();
  console.log("Insert with pincode error:", pinErr?.message || "No error");

  // Try with address
  console.log("Trying insert with address...");
  const { error: addrErr } = await supabase.from("bookings").insert({ ...baseBooking, address: "123 Street" }).select();
  console.log("Insert with address error:", addrErr?.message || "No error");
}

run();




