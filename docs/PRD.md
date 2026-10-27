# Linkwell Product Requirements Document

**Product:** Linkwell  
**Tagline:** Great talent. Wider possibilities.  
**Primary market:** African talent, with global employer reach and later geographic expansion.

## Product goal
Help African professionals discover legitimate work and help employers find talent through a trustworthy, moderated marketplace.

## Work types
- Full-time employment
- Part-time employment
- Freelance projects
- Contract work

## Roles and permissions
- Talent: create and manage a profile, browse and save opportunities, apply, and track applications.
- Employer: create a company profile, draft and manage listings, review applications, and manage paid listing/subscription entitlements.
- Administrator: review every new or edited listing before publication, moderate employers/listings, and manage marketplace operations.
- Public visitor: browse approved listings and public company information.

## Listing lifecycle
Draft → submitted for review → approved/published OR rejected with reason → edited/resubmitted. New listings must never become public before admin approval. Material edits to published listings require re-review.

## Monetization
- Free talent accounts.
- Paid job listings.
- Employer subscriptions.
- Payment provider to be selected and configured after country, settlement, fees, and webhook support are confirmed. Do not simulate successful payments.

## Brand and UX
- Forest green: #123D2B
- Soft mint: #D7FBE8
- Warm white: #FAFAF7
- Charcoal: #171A18
- Premium, clean, mobile-first, accessible and fast.
- No invented vacancy counts, fake testimonials, or sample listings presented as real.

## Planned technical architecture
- Next.js App Router + TypeScript
- Vercel hosting and Git-connected deployments
- Neon PostgreSQL
- One established authentication provider with verified email and server-side role checks
- Private object storage for CVs and attachments
- Payment provider with signed webhook verification
- Server-side validation, rate limiting, audit logs, secure file access, and least-privilege database access

## Core launch features
1. Public landing page and opportunity search/filtering.
2. Approved vacancy detail pages.
3. Talent signup/sign-in, profile, CV upload, applications and application tracking.
4. Employer signup, company profile, listing creation, listing management and applicant review.
5. Admin-only moderation queue, approve/reject with reason, user/listing management and audit trail.
6. Billing for paid listings/subscriptions, verified webhook processing, entitlement enforcement and receipts.
7. Legal pages, contact/support flow, privacy-conscious data retention and deletion.
8. Responsive layouts, accessibility, metadata, error states, tests and production monitoring.

## Non-negotiable security and quality
- Never expose CVs or private applicant data through public URLs.
- Never grant administrator access solely because an email matches a hard-coded address.
- Enforce authorization on the server for every protected operation.
- Verify payment signatures before granting entitlements.
- Keep secrets out of source control and client bundles.
- Do not publish listings until moderation approval is persisted.
- Test production build, authentication, permissions, moderation, uploads, billing and mobile flows before calling the platform launch-ready.

## Current status (2026-10-27)
The GitHub repository was verified to contain only its initial README at the start of this work. A local 16-file visual foundation exists, but no deployment or production build was verified. Database, authentication, storage, moderation, applications and billing are not yet verified as implemented. The Vercel project has no deployments, so there is no confirmed live production URL yet.
