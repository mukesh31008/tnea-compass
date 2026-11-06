import { NextResponse, type NextRequest } from "next/server";

import { searchColleges } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 8);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 20)
    : 8;

  if (query.length < 2) {
    return NextResponse.json({ colleges: [] });
  }

  try {
    const { colleges } = await searchColleges({ q: query, limit });
    return NextResponse.json({
      colleges: colleges.map((college) => ({
        code: college.code,
        name: college.shortName ?? college.name,
        district: college.district,
        type: college.type,
      })),
    });
  } catch (error) {
    console.error("College search failed:", error);
    return NextResponse.json(
      { colleges: [], error: "Search is temporarily unavailable." },
      { status: 503 },
    );
  }
}
