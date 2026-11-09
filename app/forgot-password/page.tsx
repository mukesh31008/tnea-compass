import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link for your TNEA Compass account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="container-page flex justify-center py-12 md:py-20">
      <ForgotPasswordForm />
    </section>
  );
}
