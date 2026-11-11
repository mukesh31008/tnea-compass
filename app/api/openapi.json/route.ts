import { NextResponse } from "next/server";

export const dynamic = "force-static";

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "TNEA Compass API",
    version: "1.2.0",
    description:
      "Official REST API specification for TNEA Compass. Provides endpoints for querying college cutoffs, deterministic cited assistant answers, choice list synchronization, and DPDP Act compliance.",
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Database health probe",
        responses: {
          "200": {
            description: "Service is operational",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/colleges/search": {
      get: {
        summary: "Fuzzy college search",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Matching colleges",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/assistant": {
      post: {
        summary: "Grounded Cited Assistant",
        responses: {
          "200": {
            description: "Cited Answer",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/choices": {
      get: { summary: "Fetch synced choice list" },
      post: { summary: "Update synced choice list" },
    },
    "/api/account/export": {
      get: { summary: "DPDP Act personal data export" },
    },
  },
};

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
