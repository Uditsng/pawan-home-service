import { NextResponse } from "next/server";
import { getFallbackPincodeData } from "@/lib/pincodeFallback";

interface PostOffice {
  Name: string;
  Pincode: string;
  District: string;
  State: string;
}

const PINCODE_REGEX = /^\d{6}$/;
const UPSTREAM_URL = "https://api.postalpincode.in/pincode";

function uniqueOffices(offices: PostOffice[]): PostOffice[] {
  const seen = new Set<string>();
  const result: PostOffice[] = [];
  for (const office of offices) {
    if (!office.Name) continue;
    if (seen.has(office.Name)) continue;
    seen.add(office.Name);
    result.push(office);
  }
  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;

  if (!PINCODE_REGEX.test(pincode)) {
    return NextResponse.json(
      { pincode, offices: [], error: "Invalid pincode format." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${UPSTREAM_URL}/${pincode}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : undefined;
      const offices: PostOffice[] = first?.PostOffice ?? [];

      if (first?.Status === "Success" && offices.length > 0) {
        return NextResponse.json({
          pincode,
          offices: uniqueOffices(offices),
          source: "api",
        });
      }
    }
  } catch (error) {
    console.error("[PincodeAPI] Upstream fetch failed:", error);
  }

  const fallback = getFallbackPincodeData(pincode);
  return NextResponse.json({
    pincode,
    offices: fallback,
    source: fallback.length > 0 ? "fallback" : "none",
  });
}
