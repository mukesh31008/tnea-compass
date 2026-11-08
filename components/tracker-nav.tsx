"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/tracker/academic", label: "Academics", icon: NotebookPen },
  { href: "/tracker/results", label: "Results", icon: GraduationCap },
  { href: "/tracker/exams", label: "Exams", icon: BookOpenCheck },
  { href: "/tracker/applications", label: "Applications", icon: ListTodo },
] as const;

export function TrackerNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Private tracker"
      className="container-page -mb-px flex gap-1 overflow-x-auto border-b border-border pt-1"
    >
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[12px] font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
