import "server-only";

/**
 * Optional transactional email. Nothing here runs unless RESEND_API_KEY and
 * EMAIL_FROM are set, so local development and key-less deployments keep
 * working. The auth flow stays disabled rather than pretending to send mail.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!emailConfigured()) return false;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    console.error("Email delivery failed:", response.status, await response.text());
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  return sendEmail({
    to,
    subject: "Reset your TNEA Compass password",
    text: `Use this link to reset your TNEA Compass password. It expires in one hour.\n\n${url}\n\nIf you did not ask for this, ignore the email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#151b19">
        <h2 style="margin:0 0 12px">Reset your password</h2>
        <p>Use the link below to choose a new password. It expires in one hour.</p>
        <p><a href="${url}" style="color:#0d7268;font-weight:600">Reset password</a></p>
        <p style="color:#6a726e;font-size:13px">If you did not ask for this, ignore the email. Your current password still works.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  return sendEmail({
    to,
    subject: "Verify your TNEA Compass email",
    text: `Confirm your email for TNEA Compass:\n\n${url}\n\nIf you did not create an account, ignore this message.`,
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#151b19">
        <h2 style="margin:0 0 12px">Verify your email</h2>
        <p>Confirm the address used for your private TNEA Compass account.</p>
        <p><a href="${url}" style="color:#0d7268;font-weight:600">Verify email</a></p>
        <p style="color:#6a726e;font-size:13px">If you did not create an account, ignore this message.</p>
      </div>
    `,
  });
}
