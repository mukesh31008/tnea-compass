"use client";

import * as React from "react";
import Link from "next/link";
import { CloudDownload, CloudUpload, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useChoices } from "@/components/choices-provider";
import { useSession } from "@/lib/auth-client";
import { parseChoices } from "@/lib/choices";

type SavedPayload = {
  saved?: boolean;
  updatedAt?: string | null;
  choices?: unknown;
  error?: string;
};

export function ChoiceSync() {
  const { choices, replace } = useChoices();
  const { data: session, isPending } = useSession();
  const [busy, setBusy] = React.useState<"save" | "load" | "delete" | null>(
    null,
  );

  if (isPending) return null;

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href="/sign-in?next=%2Fchoices">
          <CloudUpload className="size-3.5" />
          Sign in to sync
        </Link>
      </Button>
    );
  }

  async function save() {
    setBusy("save");
    try {
      const response = await fetch("/api/choices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices }),
      });
      const payload = (await response.json().catch(() => null)) as
        | SavedPayload
        | null;
      if (!response.ok) {
        toast.error(payload?.error ?? "Could not save the list.");
        return;
      }
      toast.success("Choice list saved to your account", {
        description: "Only this account can read it.",
      });
    } catch {
      toast.error("The account service is unreachable.");
    } finally {
      setBusy(null);
    }
  }

  async function load() {
    setBusy("load");
    try {
      const response = await fetch("/api/choices", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | SavedPayload
        | null;
      if (!response.ok) {
        toast.error(payload?.error ?? "Could not read the saved list.");
        return;
      }
      if (!payload?.saved) {
        toast.info("No saved list yet. Save this browser's list first.");
        return;
      }
      if (
        choices.length > 0 &&
        !window.confirm(
          `Replace this browser's ${choices.length} choices with the saved copy?`,
        )
      ) {
        return;
      }
      const next = parseChoices(JSON.stringify(payload.choices ?? []));
      replace(next);
      toast.success(`Loaded ${next.length} saved choices`);
    } catch {
      toast.error("The account service is unreachable.");
    } finally {
      setBusy(null);
    }
  }

  async function removeSaved() {
    if (!window.confirm("Delete the copy saved to your account? The browser list stays.")) {
      return;
    }
    setBusy("delete");
    try {
      const response = await fetch("/api/choices", { method: "DELETE" });
      if (!response.ok) {
        toast.error("Could not delete the saved copy.");
        return;
      }
      toast.success("Saved copy deleted");
    } catch {
      toast.error("The account service is unreachable.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => void save()}
        disabled={busy !== null}
      >
        {busy === "save" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CloudUpload className="size-3.5" />
        )}
        Save to account
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => void load()}
        disabled={busy !== null}
      >
        {busy === "load" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CloudDownload className="size-3.5" />
        )}
        Load saved
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-destructive"
        onClick={() => void removeSaved()}
        disabled={busy !== null}
        aria-label="Delete the saved account copy"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
