"use client";

import * as React from "react";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/app/tracker/actions";

export function DangerZone() {
  const [confirmation, setConfirmation] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteAccount();
    if (result && !result.ok) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card id="data" className="scroll-mt-24 border-destructive/25 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="size-4 text-destructive" />
        Your data, your exit
      </h2>
      <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
        Export a complete JSON copy of your profile, marks, exams and
        applications whenever you want. Deleting the account removes those
        server-side rows permanently. The choice list is stored in this browser
        only, so clear it from the{" "}
        <a href="/choices" className="font-medium text-primary underline">
          choice list page
        </a>{" "}
        if you want that gone too.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/api/account/export">
            <Download className="size-4" />
            Export my data (JSON)
          </a>
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-[12px] font-medium">
          Delete this account and every saved tracker row
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Type <span className="font-mono font-semibold text-foreground">DELETE</span>{" "}
          to enable the button. This cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
            className="h-9 w-40 font-mono text-[12px]"
            aria-label="Type DELETE to confirm account deletion"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={confirmation !== "DELETE" || pending}
            onClick={handleDelete}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {pending ? "Deleting…" : "Delete account"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[12px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
