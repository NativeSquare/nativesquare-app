import { registerRoutes } from "@nativesquare/upwork";
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { resend } from "./emails";

const http = httpRouter();

// Auth routes
auth.addHttpRoutes(http);

// Resend webhook for email delivery tracking
// Set up webhook in Resend dashboard pointing to:
// https://<your-deployment>.convex.site/resend-webhook
// Enable all email.* events and set RESEND_WEBHOOK_SECRET env var
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// Upwork OAuth callback — handled by the @nativesquare/upwork component.
// Redirect URI in Upwork Developer Portal must be: {CONVEX_SITE_URL}/upwork/callback
registerRoutes(http, components.upwork, {
  clientId: process.env.UPWORK_CLIENT_ID!,
  clientSecret: process.env.UPWORK_CLIENT_SECRET!,
  onSuccess: `${process.env.SITE_URL}/dashboard`,
});

export default http;
