import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Simple self-contained .env.local parser to avoid external dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    console.log(`Parsing environment from ${envPath}...`);
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const index = trimmed.indexOf("=");
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim();
        // Remove surrounding quotes if present
        const cleanValue = value.replace(/^['"]|['"]$/g, "");
        process.env[key] = cleanValue;
      }
    }
  } else {
    console.warn("Warning: .env.local not found in current working directory.");
  }
}

async function migrate() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment.");
    process.exit(1);
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // 1. Ensure the 'services' bucket exists
  console.log("Checking storage bucket 'services'...");
  const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
  if (listBucketsError) {
    console.error("Error listing buckets:", listBucketsError.message);
    process.exit(1);
  }

  const servicesBucketExists = buckets.some(b => b.id === "services");
  if (!servicesBucketExists) {
    console.log("Bucket 'services' does not exist. Creating bucket...");
    const { error: createBucketError } = await supabase.storage.createBucket("services", {
      public: true,
      fileSizeLimit: 1048576, // 1MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });

    if (createBucketError) {
      console.error("Error creating bucket:", createBucketError.message);
      process.exit(1);
    }
    console.log("Bucket 'services' created successfully.");
  } else {
    console.log("Bucket 'services' verified (already exists).");
  }

  // 2. Fetch all services
  console.log("Fetching services from database...");
  const { data: services, error: fetchServicesError } = await supabase
    .from("services")
    .select("id, title, image_url");

  if (fetchServicesError) {
    console.error("Error fetching services:", fetchServicesError.message);
    process.exit(1);
  }

  console.log(`Found ${services?.length || 0} services in the database.`);

  if (!services || services.length === 0) {
    console.log("No services to migrate.");
    return;
  }

  let processedCount = 0;
  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const logs: string[] = [];

  // 3. Process each service
  for (const service of services) {
    processedCount++;
    const { id, title, image_url } = service;

    if (!image_url) {
      console.log(`[${processedCount}/${services.length}] Service "${title}" has no image_url. Skipping.`);
      skippedCount++;
      continue;
    }

    // If it's already a Supabase Storage CDN URL, skip it
    if (image_url.startsWith("http") && image_url.includes("/storage/v1/object/public/")) {
      console.log(`[${processedCount}/${services.length}] Service "${title}" already has Storage URL: ${image_url}. Skipping.`);
      skippedCount++;
      continue;
    }

    // Resolve local asset path
    let relativePath = image_url;
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.substring(1);
    }

    const localFilePath = path.resolve(process.cwd(), "public", relativePath);

    if (!fs.existsSync(localFilePath)) {
      const msg = `[${processedCount}/${services.length}] File not found locally for "${title}" at path: ${localFilePath}`;
      console.error(msg);
      logs.push(msg);
      failedCount++;
      continue;
    }

    try {
      console.log(`[${processedCount}/${services.length}] Migrating image for "${title}" (${image_url})...`);
      
      const fileBuffer = fs.readFileSync(localFilePath);
      const ext = path.extname(localFilePath).toLowerCase();
      let contentType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".webp") contentType = "image/webp";

      // Create a clean destination filename: e.g. "bathroom-cleaning.png"
      const cleanName = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const fileName = `${cleanName}${ext}`;

      console.log(`Uploading ${fileName} to bucket 'services' (Content-Type: ${contentType})...`);
      const { error: uploadError } = await supabase.storage
        .from("services")
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("services")
        .getPublicUrl(fileName);

      console.log(`Updating service database record for "${title}" with new URL: ${publicUrl}`);
      const { error: updateError } = await supabase
        .from("services")
        .update({ image_url: publicUrl })
        .eq("id", id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      migratedCount++;
      const successMsg = `Successfully migrated "${title}" -> ${publicUrl}`;
      console.log(successMsg);
      logs.push(successMsg);

    } catch (err) {
      const errorMsg = `Failed to migrate "${title}": ${(err as Error).message}`;
      console.error(errorMsg);
      logs.push(errorMsg);
      failedCount++;
    }
  }

  // 4. Print Migration Report
  console.log("\n=== IMAGE MIGRATION COMPLETE ===");
  console.log(`Total Processed: ${processedCount}`);
  console.log(`Successfully Migrated: ${migratedCount}`);
  console.log(`Skipped (Already on Storage or No URL): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log("\nMigration Logs:");
  logs.forEach(log => console.log(`- ${log}`));
}

migrate().catch(err => {
  console.error("Migration script failed with exception:", err);
  process.exit(1);
});
