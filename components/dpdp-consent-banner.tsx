"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tnea:dpdp_consent";

export function DpdpConsentBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // LocalStorage not available or restricted
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ agreed: true, timestamp: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
  }

  if (!mounted || !visible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Privacy and data protection notice"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md sm:bottom-6 sm:p-5 print-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
            <ShieldCheck className="size-4 shrink-0" />
          </div>
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-semibold text-foreground">
              Your Privacy & DPDP Act Protection
            </p>
            <p className="text-muted-foreground">
              TNEA Compass uses local storage for your choice list and privacy-friendly session cookies.
              Under the DPDP Act 2023, your data remains 100% yours: exportable and erasable anytime.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/privacy">Read Policy</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAccept}
            className="h-8 text-xs font-semibold"
          >
            Got it, continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss banner"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
