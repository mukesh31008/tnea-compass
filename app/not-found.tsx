import Link from "next/link";
import { Compass, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <Card className="max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-6" />
        </span>
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          404
        </p>
        <h1 className="display mt-2 text-3xl leading-tight">
          That page is off the map
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The link may be old, or the page may not exist yet. The college record
          is still where you left it.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild className="gap-1.5">
            <Link href="/colleges">
              <Search className="size-4" />
              Explore colleges
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
