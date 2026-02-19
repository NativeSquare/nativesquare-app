---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
date: 2026-02-19
author: NativeSquare
---

# Product Brief: nativesquare-app

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

A system that connects to Upwork via the Upwork API to automate and streamline the freelancer's daily workflow: discovering high-value job postings (e.g. >$5K in their niche), preparing applications (including Loom and tech stack/portfolio), submitting and boosting proposals, and recording each proposal in a local database for analytics. The core problem is time spent on manual steps, inconsistent tracking, and the stress of keeping a daily routine. Success is felt within a week: the process is almost fully automated, runs in the background, and is supported by analytics for A/B testing (offers, video, messaging) to win more clients—while staying within Upwork's rules so the account stays secure.

---

## Core Vision

### Problem Statement

As a freelancer/agency lead, I spend significant time every day on manual, repetitive tasks: checking job postings in my niche, preparing applications (e.g. Loom videos, tech stack, portfolio), applying and boosting proposals, and logging proposal data for follow-up. This leads to time waste, inconsistent tracking, and stress from having to keep a strict routine. The process is fragile—if I skip a day or forget a step, I lose opportunities and visibility.

### Problem Impact

- **Time:** Daily manual work blocks higher-value activities (delivery, strategy).
- **Consistency:** Without a single system, tracking is ad hoc and analytics are unreliable.
- **Stress:** The need to "go fetch clients" every day creates pressure and makes the pipeline feel unstable.
- **Optimization:** Hard to know what works (which offers, which video, which messaging) without structured data and A/B testing.

### Why Existing Solutions Fall Short

- **Manual workflow:** Doing everything by hand is slow and doesn't scale.
- **Generic tools:** Spreadsheets or random notes don't integrate with Upwork and don't automate discovery, application, or boosting.
- **No safe automation:** Fully external "bots" risk violating Upwork's terms; the solution must use the official API and behave in a compliant way.

### Proposed Solution

A dedicated system that uses the Upwork API to:

1. **Discover** relevant job postings (e.g. in your niche, above a budget threshold like $5K).
2. **Support preparation** of applications (e.g. linking Loom, tech stack, portfolio) in a repeatable way.
3. **Apply and boost** proposals directly via the API where supported.
4. **Record** every proposal and its status in a local database for tracking and analytics.
5. **Provide analytics** to run A/B tests on offers, video, and messaging to improve win rates.

The process runs in the background so the freelancer doesn't have to "go fetch clients" every day, while staying within Upwork's acceptable use so the account remains in good standing.

### Key Differentiators

- **API-first:** Uses the official Upwork API so automation is transparent and compliant, not scraping or unofficial automation.
- **End-to-end:** Covers discovery → preparation → apply/boost → tracking → analytics in one system.
- **Data-driven:** Local DB and analytics enable A/B testing and fine-tuning of which offers to apply to, which video to use, and how to message.
- **Quick impact:** Success is designed to be felt within about a week (automation in place + basic analytics).
- **Security and compliance:** Built to avoid behavior that Upwork would flag, keeping the account secure while automating the workflow.

---

## Target Users

### Primary Users

**Acquisition leads (you and your co-founder)**  
Both of you are the primary users: agency leads who own client acquisition via Upwork. You run the same workflow—discovering jobs, preparing applications (Loom, tech stack, portfolio), applying and boosting proposals, and tracking outcomes. You're motivated by saving time, reducing stress, and having reliable data to improve win rates. Success looks like the system running in the background so you don't have to "go fetch" clients manually, with a shared webapp where you can see pipeline and analytics.

**Context:** You work as a small team (you + co-founder). Anyone who can log into the webapp is a user; in practice that's the two of you. The webapp is used for other things too; the Upwork automation is one part of this larger product. There are no secondary users—only you and your co-founder.

### Secondary Users

None.

### User Journey

- **Discovery:** You and your co-founder already know the problem (manual Upwork workflow). The Upwork feature is a capability inside a webapp you already use.
- **Onboarding:** Not specific to Upwork. You're already onboarded to the webapp for other use cases; the Upwork piece is another area you use once it's available (e.g. connect Upwork API, set filters, link assets as needed).
- **Core usage:** Day-to-day, the Upwork flow runs in the background (discovery, apply/boost, DB logging). You and your co-founder use the same webapp to check pipeline, review analytics, and tune A/B tests (offers, video, messaging).
- **Success moment:** When you realize you didn't have to manually check Upwork and the pipeline is still moving, with clear numbers on what's working.
- **Long-term:** Upwork acquisition becomes a steady, mostly automated part of how you use the webapp, with occasional tuning and analytics review.

---

## Success Metrics

Success is driven by **leads**—people messaging you back on Upwork after your application—and ultimately by **signed** clients. The product should make the acquisition funnel visible and actionable so you and your co-founder can see where proposals drop off and improve each step.

**Funnel stages (what we track):**

1. **Proposal Sent** — Proposals submitted (and boosted) via the system.
2. **Proposal Viewed** — Client opened the proposal (where Upwork/API exposes this).
3. **Loom Video Viewed** — Client watched the Loom (where trackable).
4. **Interviewing** — You're in interview/discussion with the client.
5. **Signed** — Contract signed; new client acquired.

**User success:** You see the full funnel (Sent → Viewed → Loom Viewed → Interviewing → Signed) in the webapp so you know where you stand. You get **leads** (messages back / interview requests) and can attribute them to proposals sent by the system. You can use funnel data for A/B testing (offers, video, messaging) to improve conversion from Sent → Viewed → … → Signed. "Worth it" = less manual work + clear pipeline and more signed clients than without the system.

**Business objectives:** Short term (e.g. first week): funnel is populated (proposals sent and stages updating); you can see Sent → Viewed (and beyond where data exists). Ongoing: more signed clients from Upwork with less daily manual effort; funnel conversion rates (e.g. Sent→Viewed, Viewed→Interviewing, Interviewing→Signed) inform what to optimize.

### Business Objectives

- **Short term (e.g. first week):** Funnel is populated (proposals sent and stages updating); you can see Sent → Viewed (and beyond where data exists).
- **Ongoing:** More signed clients from Upwork with less daily manual effort; funnel conversion rates inform what to optimize.

### Key Performance Indicators

- **Volume:** Proposals sent per week (or per day).
- **Funnel conversion:** % Proposal Viewed (of Sent); % Loom Viewed (of Viewed, where available); % Interviewing (of Sent or Viewed); % Signed (of Sent).
- **Outcome:** Number of **leads** (messages back / interview requests) and number of **Signed** clients per week or month.
- **Efficiency:** Time you and your co-founder spend on acquisition (goal: decrease while maintaining or increasing Signed).

---

## MVP Scope

### Core Features

- **Job discovery & "what to apply to"** — The system discovers relevant Upwork jobs (e.g. in your niche, >$5K) and surfaces them in the webapp so you and your co-founder can see **what to apply to** and decide which ones deserve a Loom video.
- **Video link + pre-generated proposal text** — You make the Loom video yourself. You provide the **video link** (and any other assets, e.g. tech stack, portfolio). The system **pre-generates the application text** (cover letter / proposal body) so you don't write from scratch.
- **Edit before send** — You can **edit the proposal text** before sending. No forced "send now"; you review and adjust when needed.
- **Apply & boost** — From the same flow you **submit the proposal** and **boost** it via the Upwork API (where supported).
- **Tracking / funnel** — Each proposal is **recorded** (e.g. in your DB) so you can see status and basic funnel (Sent → Viewed → … → Signed) as the API/data allows.

**MVP = automate everything except video making:** discovery, what to apply to, pre-filled text from your video link (and assets), edit, send, boost, and tracking.

### Out of Scope for MVP

- **Automated video creation** — You make the Loom video; the system does not create or edit video.
- Optional for later: heavy A/B analytics UI, automated Loom view tracking, or other "nice to have" analytics can be post-MVP if not in the first version.

### MVP Success Criteria

- You see **what to apply to** (discovery/list) and can make the right video for each job.
- You **paste the video link** (and assets); the system **pre-generates** proposal text.
- You **edit** when needed and **send + boost** without retyping everything manually.
- Proposals are **tracked** so you have a basic funnel view (e.g. Sent → Viewed → Interviewing → Signed where data exists).
- **Success =** less manual work and a clear path from "see job" → "add video link" → "edit & send" → "track."

### Future Vision

- Post-MVP: richer funnel analytics, A/B testing on offers/video/messaging, and any further automation (e.g. smarter pre-generation, templates). Long term: keep as internal tool or extend to more users/platforms as needed.
