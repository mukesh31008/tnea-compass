import { cn } from "@/lib/utils";
import { Reveal } from "@/components/reveal";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("relative border-b border-border bg-surface/60", className)}>
      <div className="pointer-events-none absolute inset-0 fine-grid opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-page relative py-10 md:py-14">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="display text-3xl leading-[1.08] text-foreground sm:text-4xl md:text-[2.9rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
