"use client";

import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useChoices } from "@/components/choices-provider";
import type { ChoiceInput } from "@/lib/choices";
import { cn } from "@/lib/utils";

export function AddToChoice({
  input,
  iconOnly = false,
  className,
}: {
  input: ChoiceInput;
  iconOnly?: boolean;
  className?: string;
}) {
  const { add, has, ready } = useChoices();
  const added = has(input.id);

  const label = added ? "In my list" : "Add to my list";
  const college = input.collegeShortName ?? input.collegeName;

  return (
    <Button
      type="button"
      variant={added ? "secondary" : "outline"}
      size={iconOnly ? "icon-sm" : "sm"}
      disabled={!ready || added}
      aria-label={`${label}: ${college}, ${input.branchName}`}
      title={added ? "Already in your choice list" : label}
      className={cn(!iconOnly && "gap-1.5", className)}
      onClick={() => {
        const result = add(input);
        if (result === "added") {
          toast.success("Added to My list", {
            description: `${college} · ${input.branchCode}`,
          });
        } else if (result === "exists") {
          toast.info("Already in your list");
        } else {
          toast.error("Your choice list is full", {
            description: "Remove a choice before adding another.",
          });
        }
      }}
    >
      {added ? <Check /> : <Plus />}
      {!iconOnly && (added ? "In list" : "Add to list")}
    </Button>
  );
}
