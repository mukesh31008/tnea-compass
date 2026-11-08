import type { Metadata } from "next";
import { CalendarDays, Mail, ShieldCheck } from "lucide-react";

import { DangerZone } from "@/components/danger-zone";
import { ProfileForm, type ProfileValues } from "@/components/profile-form";
import { TrackerShell } from "@/components/tracker-shell";
import { Card } from "@/components/ui/card";
import { getDistrictOptions } from "@/lib/db/queries";
import { getStudentProfile } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser("/profile");
  const [profile, districts] = await Promise.all([
    getStudentProfile(session.user.id),
    getDistrictOptions(),
  ]);

  const initial: ProfileValues = {
    displayName: profile?.displayName ?? "",
    phone: profile?.phone ?? "",
    district: profile?.district ?? "",
    schoolName: profile?.schoolName ?? "",
    schoolType: profile?.schoolType ?? "",
    medium: profile?.medium ?? "",
    community: profile?.community ?? "",
    gender: profile?.gender ?? "",
  };

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title="Profile"
      description="A minimal planning profile. Official eligibility is decided only by the TNEA application and the documents you submit there."
    >
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <ProfileForm
          initial={initial}
          districts={districts.map((district) => district.district)}
        />

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="size-4 text-primary" />
              Account
            </h2>
            <dl className="mt-3 space-y-2 text-[12px]">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all font-medium">{session.user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{session.user.name}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3" />
                  Joined
                </dt>
                <dd className="font-medium">
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(session.user.createdAt))}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="border-primary/20 bg-accent/25 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Separation of records
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              The public cutoff tables come from official TNEA PDFs. Everything
              you type here is marked as your own entry and never changes a
              published value. If a field is blank, the interface shows it as
              not set rather than guessing.
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <DangerZone />
      </div>
    </TrackerShell>
  );
}
