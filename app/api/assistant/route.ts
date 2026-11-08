import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { answerQuestion } from "@/lib/assistant/answer";
import { readAnswer, writeAnswer } from "@/lib/assistant/cache";
import { clientKey, rateLimit } from "@/lib/assistant/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 500;

const requestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a complete question.")
    .max(MAX_QUESTION_LENGTH, `Keep the question under ${MAX_QUESTION_LENGTH} characters.`),
});

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Send a JSON body with a question field." },
      { status: 415, headers: NO_STORE },
    );
  }

  const limit = rateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((limit.resetAt - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        error:
          "Too many questions in a short time. Wait a moment, then ask again.",
      },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body is not valid JSON." },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Ask a question about the published TNEA record.",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const question = parsed.data.question;
  const key = question.toLowerCase().replace(/\s+/g, " ");

  const headers = {
    ...NO_STORE,
    "X-RateLimit-Limit": String(limit.limit),
    "X-RateLimit-Remaining": String(limit.remaining),
  };

  const cached = readAnswer(key);
  if (cached) {
    return NextResponse.json(
      { result: cached },
      { headers: { ...headers, "X-Answer-Cache": "hit" } },
    );
  }

  try {
    const result = await answerQuestion(question);
    writeAnswer(key, result);
    return NextResponse.json(
      { result },
      { headers: { ...headers, "X-Answer-Cache": "miss" } },
    );
  } catch (error) {
    console.error("Assistant answer failed:", error);
    return NextResponse.json(
      {
        error:
          "The record could not be read just now. Try again in a moment; no value was guessed.",
      },
      { status: 503, headers },
    );
  }
}
