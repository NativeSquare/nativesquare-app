import { Email } from "@convex-dev/auth/providers/Email";
import { alphabet, generateRandomString } from "oslo/crypto";
import { APP_DOMAIN, APP_NAME, APP_ADDRESS } from "@packages/shared/constants";
import { Resend as ResendAPI } from "resend";

/** Plain HTML for Convex runtime (no React) to avoid minified React error #31. */
function getForgotPasswordHtml(code: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#fff;color:#51525C;padding:16px;">
<p style="font-size:14px;margin:8px 0;">Hi there,</p>
<p style="font-size:14px;margin:8px 0;">To reset your password, please use the following code:</p>
<p style="font-size:24px;font-weight:600;margin:24px 0;"><strong>${escapeHtml(code)}</strong></p>
<p style="font-size:14px;margin:8px 0;">This code will only be valid for the next 5 minutes.</p>
<p style="font-size:14px;margin:8px 0;">Thanks,</p>
<p style="font-size:14px;margin:8px 0;">The ${escapeHtml(APP_NAME)} Team</p>
<hr style="margin:16px 0;">
<p style="font-size:14px;margin:8px 0;">© 2025 ${escapeHtml(APP_NAME)}, ${escapeHtml(APP_ADDRESS)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const ResendOTPPasswordReset = Email({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 20, // 20 minutes
  async generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);

    const isDev = process.env.IS_DEV === "true";
    if (isDev) {
      console.log(`[DEV] Email to ${email}: Reset your password`);
      console.log(`[DEV] Verification code: ${token}`);
      return;
    }

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <no-reply@${APP_DOMAIN}>`,
      to: [email],
      subject: "Reset your password",
      html: getForgotPasswordHtml(token),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
