import Link from "next/link";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

const COLUMNS = [
  {
    title: "Plan",
    links: [
      { label: "Ask the record", href: "/assistant" },
      { label: "College explorer", href: "/colleges" },
      { label: "Cutoff trends", href: "/cutoffs" },
      { label: "Where you stand", href: "/predictor" },
      { label: "Compare colleges", href: "/compare" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Choice list", href: "/choices" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Academic tracker", href: "/tracker/academic" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Admission pathways", href: "/pathways" },
      { label: "Methodology", href: "/about#method" },
      { label: "Data provenance", href: "/about#data" },
      { label: "Privacy", href: "/about#privacy" },
      { label: "Disclaimer", href: "/about#disclaimer" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/50 print-hidden">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              An independent, data-first guide to Tamil Nadu engineering
              admissions. Built on seven years of published TNEA cutoffs and seat
              allotment records.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Data updated for 2026 counselling
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/75 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl">
            TNEA Compass is not affiliated with the Directorate of Technical
            Education, Tamil Nadu. Cutoff and seat data is compiled from
            published TNEA records. Always verify decisions on{" "}
            <a
              href="https://www.tneaonline.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
            >
              tneaonline.org
            </a>
            .
          </p>
          <p className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} TNEA Compass
          </p>
        </div>
      </div>
    </footer>
  );
}
