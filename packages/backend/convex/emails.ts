"use node";

import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { APP_DOMAIN, APP_NAME } from "@packages/shared/constants";

// Initialize the Resend component
// Set testMode: false when ready for production
export const resend = new Resend(components.resend, {
  testMode: process.env.IS_DEV === "true",
});

// Default sender address
const DEFAULT_FROM = `${APP_NAME} <no-reply@${APP_DOMAIN}>`;

/**
 * Generic email sending action that accepts pre-rendered HTML.
 * Use this as a base for specific email actions.
 */
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.array(v.string())),
  },
  returns: v.string(), // Returns EmailId
  handler: async (ctx, args) => {
    const emailId = await resend.sendEmail(ctx, {
      from: args.from ?? DEFAULT_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    return emailId;
  },
});

// =============================================================================
// Admin Invite Email
// =============================================================================

import { AdminInviteEmail } from "@packages/transactional";

export const sendAdminInviteEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    token: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const inviteUrl = `${process.env.ADMIN_URL || "http://localhost:3001"}/accept-invite?token=${args.token}`;

    const isDev = process.env.IS_DEV === "true";
    if (isDev) {
      console.log(`[DEV] Admin invite email to ${args.to}`);
      console.log(`[DEV] Invite URL: ${inviteUrl}`);
      return "dev-email-id";
    }

    const html = await render(
      AdminInviteEmail({
        name: args.name,
        inviteUrl,
      })
    );

    const emailId = await resend.sendEmail(ctx, {
      from: DEFAULT_FROM,
      to: args.to,
      subject: `You're invited to join ${APP_NAME} Admin`,
      html,
    });

    return emailId;
  },
});
