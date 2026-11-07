"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useChoices } from "@/components/choices-provider";

const NAV = [
  { href: "/colleges", label: "Colleges" },
  { href: "/cutoffs", label: "Cutoffs" },
  { href: "/predictor", label: "Position" },
  { href: "/compare", label: "Compare" },
  { href: "/choices", label: "My list" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useChoices();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200 print-hidden",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-xl"
          : "border-transparent bg-background/60 backdrop-blur-md"
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-muted/80 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.label}
                    {item.href === "/choices" && count > 0 && (
                      <span className="grid min-w-4 place-items-center rounded-full bg-primary/10 px-1 font-mono text-[10px] font-semibold text-primary">
                        {count}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("tnea:open-search"))}
            className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[12px] text-muted-foreground shadow-xs transition-colors hover:border-border hover:text-foreground sm:inline-flex"
          >
            <Search className="size-3.5" />
            <span>Search</span>
            <kbd className="ml-1 rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
          <Link href="/sign-in" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/predictor" className="hidden sm:block">
            <Button size="sm" className="gap-1.5">
              Where I stand
            </Button>
          </Link>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-6">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo />
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-medium",
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {item.label}
                        {item.href === "/choices" && count > 0 && (
                          <span className="grid min-w-5 place-items-center rounded-full bg-primary/10 px-1.5 font-mono text-[10px] font-semibold text-primary">
                            {count}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
                <Link
                  href="/assistant"
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  Assistant
                </Link>
                <Link
                  href="/about"
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  About
                </Link>
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Link href="/sign-in">
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/predictor">
                  <Button className="w-full">Where I stand</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
