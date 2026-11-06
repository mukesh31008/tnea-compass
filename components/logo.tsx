import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="TNEA Compass home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-xs transition-transform duration-200 group-hover:-rotate-6">
        <Compass className="size-[18px]" strokeWidth={2.2} />
      </span>
      {showWordmark && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-tight">TNEA</span>
          <span className="text-[15px] font-medium tracking-tight text-muted-foreground">
            Compass
          </span>
        </span>
      )}
    </Link>
  );
}
