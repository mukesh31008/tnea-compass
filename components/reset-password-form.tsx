"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(
          result.error.message ??
            "The link may have expired. Request a new reset link.",
        );
        return;
      }
      setDone(true);
    } catch {
      setError("The account service is unreachable. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-md p-6 sm:p-8">
        <CheckCircle2 className="size-8 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Password changed</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          The new password is active. Sign in with it now.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push("/sign-in")}>
          Go to sign in
        </Button>
      </Card>
    );
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
      <h1 className="mt-5 text-xl font-semibold">Choose a new password</h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Use at least 8 characters. The reset link can be used once.
      </p>

      {!token && (
        <p className="mt-4 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-[12px] leading-relaxed text-warning">
          This page was opened without a reset token. Request a fresh link.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">
            New password
          </span>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">
            Confirm new password
          </span>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
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

        <Button
          type="submit"
          className="w-full"
          disabled={pending || !token}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Change password
        </Button>
      </form>
    </Card>
  );
}
