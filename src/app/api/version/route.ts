import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Query platform settings for version variables
    const { data: settings, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["minimum_supported_version", "latest_version", "force_update"]);

    if (error) {
      console.error("[VersionAPI] Database query error:", error);
    }

    // Default settings in case database rows do not exist yet
    let minVersion = "1.0.0";
    let latestVersion = "1.0.0";
    let forceUpdate = false;

    if (settings) {
      settings.forEach((row) => {
        if (row.key === "minimum_supported_version") {
          minVersion = String(row.value);
        } else if (row.key === "latest_version") {
          latestVersion = String(row.value);
        } else if (row.key === "force_update") {
          forceUpdate = row.value === "true" || row.value === true;
        }
      });
    }

    return NextResponse.json({
      minimum_supported_version: minVersion,
      latest_version: latestVersion,
      force_update: forceUpdate,
    });
  } catch (error) {
    console.error("[VersionAPI] Exception:", error);
    // Safe fallbacks on API exception
    return NextResponse.json({
      minimum_supported_version: "1.0.0",
      latest_version: "1.0.0",
      force_update: false,
    });
  }
}
