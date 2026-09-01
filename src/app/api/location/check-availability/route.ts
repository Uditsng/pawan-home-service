import { NextResponse } from "next/server";
import { getCachedPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get("pincode")?.trim() || "";
  const city = searchParams.get("city")?.trim() || "";

  try {
    const settings = await getCachedPlatformSettings();
    const liveCities = (settings.serviceAreas || []).map((c) => c.toLowerCase());
    const livePincodes = (settings.serviceablePincodes || []).map((p) => p.toLowerCase());

    const isPincodeMatched = pincode ? livePincodes.includes(pincode.toLowerCase()) : false;
    const isCityMatched = city ? liveCities.includes(city.toLowerCase()) : false;

    const available = isPincodeMatched || isCityMatched;

    return NextResponse.json({
      available,
      pincode,
      city,
      matchedBy: isPincodeMatched ? "pincode" : isCityMatched ? "city" : "none",
    });
  } catch (error) {
    console.error("[CheckAvailabilityAPI] Error checking availability:", error);
    return NextResponse.json(
      { available: true, pincode, city, error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
