# Linkwell

**Great talent. Wider possibilities.**

Linkwell is a talent marketplace being built to connect African professionals with employers around the world.

## Current implementation status

The repository now contains a Next.js App Router + TypeScript application with public opportunity search, account registration and email verification, email-link sign-in, server-side role checks, talent profiles and public talent discovery, saved opportunities, applications and application tracking, employer listing management and applicant review, admin moderation interfaces, and CI checks for typechecking and production builds.

This is **not yet launch-ready**. Passing CI verifies code compilation and the production build, not live database, email, authorization, or end-to-end behavior. The live health endpoint last returned `503` with `database: not_configured`. The latest production deployment is behind GitHub main, and attempts to deploy the current commit failed with Vercel `git_info_fail`. The live application must not be treated as fully operational until the database connection, email delivery, role flows, and production deployment are verified.

See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for audited status and launch blockers, and [docs/PRD.md](docs/PRD.md) for the intended product scope.

## Stack

- Next.js App Router, React, and TypeScript
- Vercel hosting
- Neon PostgreSQL
- Current account flow: database-backed email verification and sign-in links sent through Brevo
- Planned: private object storage for CVs and attachments, and a payment provider with verified webhooks

## Local development

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run typecheck
npm run build
```

The GitHub Actions workflow installs dependencies and runs both checks on pushes and pull requests. Check the relevant GitHub Actions run before claiming a build passes.

## Brand

- Forest green: `#123D2B`
- Soft mint: `#D7FBE8`
- Warm white: `#FAFAF7`
- Charcoal: `#171A18`

## Security requirements

Never expose CVs publicly, grant admin rights based only on an email address, publish listings before moderation approval, or grant paid entitlements without verified payment webhooks. Keep secrets server-side and out of source control.