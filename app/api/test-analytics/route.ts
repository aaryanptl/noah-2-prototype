import { getGlobalAnalytics } from "@/lib/analytics-agent";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getGlobalAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
