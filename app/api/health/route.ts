import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Deployment probe. It checks that the process is up and the database answers
 * a trivial query. It never returns row counts, connection strings or errors.
 */
export async function GET() {
  try {
    await db.run(sql`select 1`);
    return NextResponse.json(
      { status: "ok", database: "reachable" },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
