"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("sign-in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result =
        mode === "sign-up"
          ? await signUp.email({
              name: name.trim() || email.split("@")[0],
              email: email.trim(),
              password,
            })
          : await signIn.email({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setError(
          result.error.message ??
            "That did not work. Check the details and try again.",
        );
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("The account service is unreachable. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1 shadow-xs">
        {(
          [
            ["sign-in", "Sign in"],
            ["sign-up", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              mode === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium">
              Name you want to see
            </span>
            <Input
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional"
              maxLength={80}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">Email</span>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">Password</span>
          <Input
            name="password"
            type="password"
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={
              mode === "sign-up" ? "At least 8 characters" : "Your password"
            }
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LockKeyhole className="size-4" />
          )}
          {mode === "sign-up" ? "Create account" : "Sign in"}
          {!pending && <ArrowRight className="size-3.5" />}
        </Button>
      </form>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        The tracker stores only what you type: profile details, subject marks,
        exams and applications. There is no Aadhaar, date of birth, uploaded
        document or public profile. You can export or delete everything from
        your dashboard. Read the{" "}
        <Link href="/about#privacy" className="font-medium text-primary underline">
          privacy note
        </Link>
        .
      </p>
    </div>
  );
}
