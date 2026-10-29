# Linkwell implementation status

**Last audited:** 2026-10-29

## Implemented in GitHub main

- Responsive public site and informational/legal pages.
- Neon PostgreSQL schema and server-side database helper.
- Public opportunity search and opportunity detail pages, with public API queries restricted to published and non-expired listings.
- Registration, email verification, email-link sign-in, resend verification, sign-out, hashed one-time tokens, expiring sessions, and server-side role checks.
- Talent profile editing, profile visibility controls, public talent directory, saved opportunities, application submission and application history.
- Employer job/listing management, applicant review/status updates, private employer notes, listing archive controls.
- Admin moderation queue/actions and employer verification review/search.
- Application tracker keyword search and status filters.
- GitHub Actions CI currently runs dependency installation, TypeScript checks and a production build. Main commit `f13da02709be7a73d014401a12af23f72dfeef2c` passed CI run [40855511077](https://github.com/mrceogodwin/Linkwell/actions/runs/40855511077).

## Verified deployment observations

- The canonical Vercel project is `linkwell` under the existing account; do not create a duplicate project.
- The latest confirmed READY production deployment is commit `c396f6aff28bf5a7be89366456ff8cfddcca8f97`, older than current main.
- The live `/api/health` endpoint returned HTTP 503 with `database: not_configured` when checked on 2026-10-29.
- Attempts to deploy current main `f13da02709be7a73d014401a12af23f72dfeef2c` returned Vercel `git_info_fail`; neither attempt became a successful deployment.
- Current Vercel project environment listing includes `DATABASE_URL`, but production runtime still needs verification after a successful deployment. `BREVO_API_KEY` and `LINKWELL_FROM_EMAIL` were not present in the visible environment-variable listing, so registration/sign-in email delivery is not configured until those values are added. Never put credentials in GitHub.
- A Neon Auth endpoint and related variables exist in Vercel, but the currently merged code uses Brevo email links and database sessions. The open draft PR #1 migrating to Neon Auth remains unmerged and must not be represented as live.

## Launch blockers and remaining work

1. **Deployment and environment:** resolve the Vercel Git-source/deployment error; deploy current main to the existing project; confirm the production alias points to that commit.
2. **Database:** verify `DATABASE_URL` is available to production runtime, test the connection, and confirm required schema/migrations are applied to the intended Neon database.
3. **Email and authentication:** configure Brevo sender/API credentials; test registration, verification, sign-in, resend, expiry, one-time token behavior, logout, role-specific redirects, and disabled accounts end to end.
4. **End-to-end permissions:** test talent, employer, and admin routes with separate accounts; verify cross-employer applicant access is denied and public talent/job data contains only intended fields.
5. **CV/attachments:** private object storage and secure upload/download authorization are not complete.
6. **Billing:** payment provider, signed webhook verification, idempotency, receipts, and paid entitlement enforcement are not complete. Do not simulate successful payments.
7. **Operational quality:** add/verify automated integration tests, error monitoring, rate limiting strategy, backup/restore, retention/deletion, and support contact.
8. **Legal and launch checks:** review privacy/terms, accessibility and mobile flows, seed only clearly identified test data, and run a final production smoke test.

## Important distinction

A passing CI build proves the code compiles and the framework can build it. It does **not** prove that database-backed features, email delivery, permissions, billing, or production deployment work. Do not call Linkwell launched until the blockers above are resolved and tested.