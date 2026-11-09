import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { choiceLists } from "@/lib/db/schema";
import { MAX_CHOICES, parseChoices } from "@/lib/choices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function currentUser(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: NextRequest) {
  const session = await currentUser(request);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Sign in to read a saved choice list." },
      { status: 401, headers: NO_STORE },
    );
  }

  const [row] = await db
    .select()
    .from(choiceLists)
    .where(eq(choiceLists.userId, session.user.id))
    .limit(1);

  return NextResponse.json(
    {
      saved: Boolean(row),
      updatedAt: row?.updatedAt ?? null,
      choices: row ? parseChoices(row.payload) : [],
    },
    { headers: NO_STORE },
  );
}

export async function PUT(request: NextRequest) {
  const session = await currentUser(request);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Sign in to save a choice list." },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with a choices array." },
      { status: 400, headers: NO_STORE },
    );
  }

  const raw =
    typeof body === "object" && body !== null
      ? (body as { choices?: unknown }).choices
      : undefined;
  if (!Array.isArray(raw) || raw.length > MAX_CHOICES) {
    return NextResponse.json(
      { error: `The list must be an array of at most ${MAX_CHOICES} choices.` },
      { status: 400, headers: NO_STORE },
    );
  }

  // Reuse the same defensive parser as localStorage. Invalid records are
  // dropped rather than trusted because they arrived over the network.
  const choices = parseChoices(JSON.stringify(raw));
  const payload = JSON.stringify(choices);
  const updatedAt = new Date();

  await db
    .insert(choiceLists)
    .values({ userId: session.user.id, payload, updatedAt })
    .onConflictDoUpdate({
      target: choiceLists.userId,
      set: { payload, updatedAt },
    });

  return NextResponse.json(
    { saved: true, count: choices.length, updatedAt },
    { headers: NO_STORE },
  );
}

export async function DELETE(request: NextRequest) {
  const session = await currentUser(request);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Sign in to delete a saved choice list." },
      { status: 401, headers: NO_STORE },
    );
  }

  await db
    .delete(choiceLists)
    .where(eq(choiceLists.userId, session.user.id));

  return NextResponse.json({ saved: false }, { headers: NO_STORE });
}
