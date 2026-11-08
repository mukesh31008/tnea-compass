"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveProfile } from "@/app/tracker/actions";
import { COMMUNITIES, COMMUNITY_LABELS, type Community } from "@/lib/tnea";
import { GENDERS, MEDIUMS, SCHOOL_TYPES } from "@/lib/tracker";
import { cn } from "@/lib/utils";

export type ProfileValues = {
  displayName: string;
  phone: string;
  district: string;
  schoolName: string;
  schoolType: string;
  medium: string;
  community: string;
  gender: string;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20";

export function ProfileForm({
  initial,
  districts,
}: {
  initial: ProfileValues;
  districts: string[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await saveProfile(values);
    if (!result.ok) {
      setError(result.error);
    } else {
      setMessage("Profile saved.");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name you want to see" hint="Optional. Not public.">
            <Input
              value={values.displayName}
              onChange={(event) => set("displayName", event.target.value)}
              maxLength={80}
              placeholder="Your name"
            />
          </Field>

          <Field label="Phone" hint="Optional. Never shown publicly.">
            <Input
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              maxLength={20}
              inputMode="tel"
              placeholder="Optional"
            />
          </Field>

          <Field label="District">
            <select
              className={selectClass}
              value={values.district}
              onChange={(event) => set("district", event.target.value)}
            >
              <option value="">Not set</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Community" hint="Used only to label your own planning. Official eligibility is decided by TNEA.">
            <select
              className={selectClass}
              value={values.community}
              onChange={(event) => set("community", event.target.value)}
            >
              <option value="">Not set</option>
              {COMMUNITIES.map((community) => (
                <option key={community} value={community}>
                  {community} — {COMMUNITY_LABELS[community as Community]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="School name">
            <Input
              value={values.schoolName}
              onChange={(event) => set("schoolName", event.target.value)}
              maxLength={160}
              placeholder="Optional"
            />
          </Field>

          <Field label="School type">
            <select
              className={selectClass}
              value={values.schoolType}
              onChange={(event) => set("schoolType", event.target.value)}
            >
              <option value="">Not set</option>
              {SCHOOL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Medium of instruction">
            <select
              className={selectClass}
              value={values.medium}
              onChange={(event) => set("medium", event.target.value)}
            >
              <option value="">Not set</option>
              {MEDIUMS.map((medium) => (
                <option key={medium} value={medium}>
                  {medium}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gender" hint="Optional. Used only if you want the tracker to reflect a category you are checking.">
            <select
              className={selectClass}
              value={values.gender}
              onChange={(event) => set("gender", event.target.value)}
            >
              <option value="">Not set</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : message ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {pending ? "Saving…" : "Save profile"}
          </Button>
          {message && (
            <span className="text-[12px] font-medium text-success">{message}</span>
          )}
          {error && (
            <span role="alert" className="text-[12px] text-destructive">
              {error}
            </span>
          )}
        </div>
      </Card>

      <Card className={cn("border-primary/20 bg-accent/25 p-5")}>
        <h2 className="text-sm font-semibold">Why so few fields?</h2>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          This profile is for planning, not for an official application. It does
          not ask for Aadhaar, date of birth, certificates, marksheets or a
          photograph. Nothing here is shown on a public page or shared with a
          college. The official TNEA application is the only place where
          eligibility data should be submitted.
        </p>
      </Card>
    </form>
  );
}
