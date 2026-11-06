import Link from "next/link";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CollegeNotFound() {
  return (
    <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <Card className="max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Building2 className="size-6" />
        </span>
        <h1 className="display mt-5 text-3xl leading-tight">
          College not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No college in the dataset matches that TNEA code. Codes are four
          characters, for example <span className="font-mono">0001</span> for
          CEG.
        </p>
        <Button asChild className="mt-6 gap-1.5">
          <Link href="/colleges">
            <Building2 className="size-4" />
            Back to the explorer
          </Link>
        </Button>
      </Card>
    </section>
  );
}
