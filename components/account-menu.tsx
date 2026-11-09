"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

export function AccountMenu() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);

  if (isPending) {
    return <span className="size-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!data?.user) {
    return (
      <Link href="/sign-in" className="hidden sm:block">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
      </Link>
    );
  }

  const user = data.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="grid size-8 place-items-center rounded-full border border-border bg-card font-mono text-[11px] font-semibold uppercase text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {initials(user.name ?? "", user.email)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={async (event) => {
            event.preventDefault();
            setSigningOut(true);
            await signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
