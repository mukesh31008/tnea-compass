import type { Metadata } from "next";
import Link from "next/link";
import { Info, ListChecks } from "lucide-react";

import { ChoiceList } from "@/components/choice-list";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "My choice list",
  description:
    "Build, reorder and export a TNEA counselling choice list. Saved in your browser, no account needed.",
};

export default function ChoicesPage() {
  return (
    <>
      <div className="print-hidden">
        <PageHeader
          eyebrow="My list"
          title="Order your counselling choices"
          description="Add branches from college profiles or predictor results, then drag them into the order you would actually counsel. The list stays in this browser."
          actions={
            <>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <ListChecks className="size-3.5 text-primary" />
                Local to this browser
              </Badge>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/colleges">Add colleges</Link>
              </Button>
            </>
          }
        />
      </div>

      <section className="container-page py-8 md:py-10">
        <ChoiceList />

        <Card className="mt-6 border-primary/20 bg-accent/30 p-5 print-hidden">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 text-primary" />
            What this list does and does not do
          </h2>
          <div className="mt-3 grid gap-3 text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-3">
            <p>
              <span className="font-medium text-foreground">
                It keeps your order:
              </span>{" "}
              the number and drag position are yours. The tool does not rank
              colleges for you.
            </p>
            <p>
              <span className="font-medium text-foreground">
                It uses 2025 Open category data:
              </span>{" "}
              the mark and rank shown are a snapshot for OC. Other communities
              can have different closing values.
            </p>
            <p>
              <span className="font-medium text-foreground">
                It does not check eligibility:
              </span>{" "}
              always confirm rules, seats and documents on the official TNEA
              portal before counselling.
            </p>
          </div>
        </Card>
      </section>
    </>
  );
}
