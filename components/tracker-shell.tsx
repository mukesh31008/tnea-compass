import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { TrackerNav } from "@/components/tracker-nav";

/**
 * Shared shell for private pages. The caller must already have checked the
 * session; this component only renders the chrome.
 */
export function TrackerShell({
  eyebrow = "Private tracker",
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              Visible only to you
            </Badge>
            {actions}
          </>
        }
      />
      <TrackerNav />
      <section className="container-page py-8 md:py-10">{children}</section>
    </>
  );
}
