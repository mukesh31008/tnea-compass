import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to keep a private TNEA profile, academic marks, exam plan and application tracker.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  const session = await getSession();
  if (session?.user) redirect(next);

  return (
    <section className="container-page grid gap-10 py-10 md:grid-cols-[1fr_1fr] md:py-16">
      <div className="max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to the public data
        </Link>
        <Badge variant="outline" className="mt-6 gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Private by default
        </Badge>
        <h1 className="display mt-4 text-3xl leading-tight sm:text-4xl">
          Keep your own record, not someone else&apos;s guess
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The public tools stay usable without an account. Sign in only when you
          want to save a profile, subject marks, exam plan and the applications
          you are actually pursuing.
        </p>

        <ul className="mt-6 space-y-3 text-[12px] leading-relaxed text-muted-foreground">
          {[
            "Your marks and applications are visible only to your account.",
            "Official cutoff data and your own entries are labelled separately.",
            "Export a full JSON copy or delete the account at any time.",
            "No Aadhaar number, no date of birth, no uploaded certificates.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Card className="h-fit p-6 sm:p-8 md:justify-self-end">
        <h2 className="text-lg font-semibold">Continue</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Email and password only. New accounts are signed in immediately.
        </p>
        <div className="mt-6">
          <AuthForm next={next} />
        </div>
      </Card>
    </section>
  );
}
