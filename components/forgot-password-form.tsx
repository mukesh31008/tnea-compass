"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const result = await requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError(
          result.error.message ??
            "The reset request could not be sent. Try again in a moment.",
        );
        return;
      }
      setMessage(
        "If that email is registered, a reset link is on its way. The link expires in one hour.",
      );
    } catch {
      setError("The account service is unreachable. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
      <h1 className="mt-5 text-xl font-semibold">Reset your password</h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Enter the email on your account. Reset mail is only sent when a mail
        provider is configured; otherwise the site will say so instead of
        pretending.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">Email</span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {message && (
          <p
            role="status"
            className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-[12px] leading-relaxed text-success"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full gap-1.5" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          Send reset link
        </Button>
      </form>
    </Card>
  );
}
