"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// ---------------------------------------------------------------------------
// Anti-detection helpers
// ---------------------------------------------------------------------------

const RANDOM_DELAY_MIN_MS = 3000;
const RANDOM_DELAY_MAX_MS = 8000;

function gaussianRandom(min: number, max: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = (num + 3) / 6;
  num = Math.max(0, Math.min(1, num));
  return min + num * (max - min);
}

async function humanDelay(): Promise<void> {
  const ms = gaussianRandom(RANDOM_DELAY_MIN_MS, RANDOM_DELAY_MAX_MS);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Cover letter generation
// ---------------------------------------------------------------------------

function buildCoverLetter(jobTitle: string, videoLink?: string): string {
  const videoLine = videoLink
    ? `\nI've recorded a short video specifically for this role: ${videoLink}\n`
    : "";
  return `Hi,
${videoLine}
I believe my experience is a strong match for "${jobTitle}". I'd welcome the chance to discuss how I can help you achieve your goals.

Best regards`;
}

// ---------------------------------------------------------------------------
// Workflow: discover candidates and queue pending applications
// ---------------------------------------------------------------------------

export const runAutoApplyWorkflow = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(
      internal.autoApply.getSettingsInternal,
      { userId: args.userId },
    );
    if (!settings || !settings.enabled) {
      console.log(
        "[Auto-Apply] Disabled or no settings for user",
        args.userId,
      );
      return null;
    }

    const candidates = await ctx.runQuery(
      internal.autoApply.getCandidateJobs,
      {
        userId: args.userId,
        minBudget: settings.minBudget,
        limit: settings.maxApplicationsPerRun,
      },
    );

    if (candidates.length === 0) {
      console.log("[Auto-Apply] No qualifying jobs found for user", args.userId);
      return null;
    }

    console.log(
      `[Auto-Apply] Queuing ${candidates.length} pending applications for user ${args.userId}`,
    );

    for (const job of candidates) {
      const coverLetter = buildCoverLetter(
        job.title,
        settings.defaultVideoLink,
      );
      await ctx.runMutation(internal.autoApply.insertPendingApplication, {
        userId: args.userId,
        discoveredJobId: job._id,
        upworkJobId: job.upworkJobId,
        jobTitle: job.title,
        budgetAmount: job.budgetAmount,
        coverLetter,
        videoLink: settings.defaultVideoLink,
      });
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Workflow: submit an approved application via Browserbase + Playwright
// ---------------------------------------------------------------------------

export const submitApprovedApplication = internalAction({
  args: {
    applicationId: v.id("pendingApplications"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(
      internal.autoApply.getPendingApplicationInternal,
      { applicationId: args.applicationId },
    );
    if (!app || app.status !== "approved") {
      console.log("[Auto-Apply] Application not in approved state, skipping");
      return null;
    }

    const settings = await ctx.runQuery(
      internal.autoApply.getSettingsInternal,
      { userId: args.userId },
    );
    if (!settings) {
      await ctx.runMutation(
        internal.autoApply.updatePendingApplicationStatus,
        {
          applicationId: args.applicationId,
          status: "failed",
          errorMessage: "No auto-apply settings found",
        },
      );
      return null;
    }

    let browser;
    try {
      const Browserbase = (await import("@browserbasehq/sdk")).default;
      const { chromium } = await import("playwright-core");

      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      });

      const sessionConfig: Record<string, unknown> = {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        browserSettings: {
          advancedStealth: true,
          viewport: {
            width: 1366 + Math.floor(Math.random() * 200),
            height: 768 + Math.floor(Math.random() * 100),
          },
        },
      };

      if (settings.browserbaseContextId) {
        (sessionConfig.browserSettings as Record<string, unknown>).context = {
          id: settings.browserbaseContextId,
          persist: true,
        };
      }

      const session = await bb.sessions.create(
        sessionConfig as unknown as Parameters<typeof bb.sessions.create>[0],
      );
      browser = await chromium.connectOverCDP(session.connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0] ?? (await context.newPage());

      // ---- Navigate to Upwork job page ----
      const jobUrl = `https://www.upwork.com/freelance-jobs/apply/${app.upworkJobId}/`;
      console.log(`[Auto-Apply] Navigating to ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await humanDelay();

      // ---- Circuit breaker: check for CAPTCHAs or error pages ----
      const pageContent = await page.content();
      const lowerContent = pageContent.toLowerCase();
      if (
        lowerContent.includes("captcha") ||
        lowerContent.includes("security check") ||
        lowerContent.includes("access denied") ||
        lowerContent.includes("blocked")
      ) {
        throw new Error(
          "CIRCUIT_BREAKER: CAPTCHA or security check detected, aborting",
        );
      }

      // ---- Scroll naturally before interacting ----
      await page.evaluate(() => {
        window.scrollBy({
          top: 200 + Math.random() * 300,
          behavior: "smooth",
        });
      });
      await humanDelay();

      // ---- Fill cover letter ----
      const coverLetterSelector =
        'textarea[data-test="cover-letter-area"], textarea[name="coverLetter"], textarea.cover-letter';
      await page.waitForSelector(coverLetterSelector, { timeout: 15000 });
      await humanDelay();

      const coverLetterField = page.locator(coverLetterSelector).first();
      await coverLetterField.scrollIntoViewIfNeeded();
      await humanDelay();
      await coverLetterField.click();
      await humanDelay();
      await coverLetterField.fill(app.coverLetter);
      await humanDelay();

      // ---- Handle boost (1st place) ----
      if (settings.boostToFirstPlace) {
        console.log("[Auto-Apply] Attempting to set boost to 1st place");
        try {
          const boostSection = page.locator(
            '[data-test="boost-section"], .boost-proposal, [class*="boost"]',
          ).first();
          if (await boostSection.isVisible({ timeout: 5000 })) {
            await boostSection.scrollIntoViewIfNeeded();
            await humanDelay();

            const boostInput = boostSection.locator(
              'input[type="number"], input[type="text"]',
            ).first();
            if (await boostInput.isVisible({ timeout: 3000 })) {
              await boostInput.click();
              await humanDelay();
              await boostInput.fill("");
              const maxBoostLabel = boostSection.locator(
                '[class*="max"], [class*="first"], [data-test*="max"]',
              );
              let boostValue = "50";
              if (await maxBoostLabel.isVisible({ timeout: 2000 })) {
                const labelText = await maxBoostLabel.textContent();
                const match = labelText?.match(/(\d+)/);
                if (match) boostValue = match[1];
              }
              await boostInput.fill(boostValue);
              console.log(`[Auto-Apply] Boost set to ${boostValue} connects`);
            }
          }
        } catch (e) {
          console.warn("[Auto-Apply] Boost section not found or error:", e);
        }
        await humanDelay();
      }

      // ---- Scroll to submit button and click ----
      await page.evaluate(() => {
        window.scrollBy({ top: 300 + Math.random() * 200, behavior: "smooth" });
      });
      await humanDelay();

      const submitSelector =
        'button[data-test="submit-proposal"], button[type="submit"]:has-text("Submit"), button:has-text("Submit a Proposal")';
      const submitButton = page.locator(submitSelector).first();
      await submitButton.scrollIntoViewIfNeeded();
      await humanDelay();
      await submitButton.click();
      console.log("[Auto-Apply] Submit button clicked");

      // ---- Wait for confirmation ----
      await page.waitForTimeout(5000);
      const postSubmitContent = await page.content();
      if (
        postSubmitContent.toLowerCase().includes("proposal submitted") ||
        postSubmitContent.toLowerCase().includes("successfully") ||
        postSubmitContent.toLowerCase().includes("your proposal")
      ) {
        console.log("[Auto-Apply] Proposal submitted successfully");
      } else if (
        postSubmitContent.toLowerCase().includes("error") ||
        postSubmitContent.toLowerCase().includes("failed")
      ) {
        throw new Error("Submission may have failed - error detected on page");
      }

      // ---- Record success ----
      await ctx.runMutation(internal.autoApply.recordSubmittedProposal, {
        userId: args.userId,
        discoveredJobId: app.discoveredJobId,
        upworkJobId: app.upworkJobId,
        upworkJobTitle: app.jobTitle,
        coverLetter: app.coverLetter,
        videoLink: app.videoLink,
        boosted: settings.boostToFirstPlace,
      });

      await ctx.runMutation(
        internal.autoApply.updatePendingApplicationStatus,
        {
          applicationId: args.applicationId,
          status: "submitted",
        },
      );

      console.log(
        `[Auto-Apply] Successfully applied to "${app.jobTitle}" (${app.upworkJobId})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Auto-Apply] Submission failed:", message);

      await ctx.runMutation(
        internal.autoApply.updatePendingApplicationStatus,
        {
          applicationId: args.applicationId,
          status: "failed",
          errorMessage: message,
        },
      );
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore close errors
        }
      }
    }

    return null;
  },
});
