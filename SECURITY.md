# Security Policy

## Supported versions

Mitch‑Dojo is pre-1.0 software. Security fixes are provided for the latest `0.1.x` release; older releases should be upgraded rather than patched in place.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** for this repository:

<https://github.com/mitchelljfranklin/mitch-dojo/security/advisories/new>

Do **not** open a public issue for an undisclosed vulnerability. Do not include production data, student records, medical information, credentials, or other personal information in a report. Use redacted examples.

## What to include

- A clear description of the issue and its impact
- Steps to reproduce, or a minimal proof of concept
- Affected version or commit
- Any suggested mitigation, if you have one

## Response

Reports are acknowledged on a best-effort basis, normally within three business days. High and critical issues are prioritised for a patch release; timelines depend on severity, reproducibility, and the safety of a fix.

## Scope

This policy covers the Mitch‑Dojo application code, official container image, and documentation in this repository. It does not cover:

- Third-party services, reverse proxies, SMTP providers, or cloud storage configuration
- Vulnerabilities in unsupported Node.js or PostgreSQL releases
- Social engineering, physical access, or denial-of-service against a self-hosted deployment
- Authored school content, uploaded files, or secrets placed in environment files

## Dependency and release hygiene

- Production dependencies are audited with `npm audit --omit=dev --audit-level=high`.
- Dependabot monitors npm, GitHub Actions, and Docker base-image updates.
- CI runs typecheck, lint, formatting, build, unit, integration, PGlite, and PostgreSQL checks.
- Stable releases are tagged and should be verified against the source repository before deployment.
