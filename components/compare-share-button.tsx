"use client";

import * as React from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CompareShareButton({ codes, names }: { codes: string[]; names: string[] }) {
  const [copied, setCopied] = React.useState(false);

  function getShareUrl() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/compare?codes=${codes.join(",")}`;
  }

  async function handleCopy() {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Comparison link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function handleWhatsApp() {
    const url = getShareUrl();
    const collegeList = names.join(" vs ");
    const text = encodeURIComponent(
      `⚖️ Compare Colleges (${collegeList}):\nCheck out the cutoffs, seats, and fees comparison on TNEA Compass:\n${url}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  }

  return (
    <div className="flex items-center gap-1.5 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-1.5 text-xs"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleWhatsApp}
        className="gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
      >
        <Share2 className="size-3.5" />
        WhatsApp
      </Button>
    </div>
  );
}
