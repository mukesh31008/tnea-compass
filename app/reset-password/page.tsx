import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <section className="container-page flex justify-center py-12 md:py-20">
      <ResetPasswordForm token={raw ?? null} />
    </section>
  );
}
