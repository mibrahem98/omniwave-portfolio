# CI Dependency Audit Status

## What runs on every change

The `Quality` GitHub Actions workflow runs an application-quality job and a separate production-dependency-audit job on every push to `main`, pull request targeting `main`, and manual dispatch. The audit job always uploads JSON, Markdown, and status artifacts so maintainers can review the package-manager result even when the job fails.

## Direct fixes applied

The project now uses `@trpc/client`, `@trpc/react-query`, and `@trpc/server` 11.8.0 to address the reported tRPC security advisory. It also uses Drizzle ORM 0.45.2 and Axios 1.15.0, which incorporate the applicable released fixes identified by the audit.

## Remaining audit boundary

The audit remains intentionally failing when it detects unresolved high-severity findings. The current artifact still includes transitive findings beneath Expo, Metro, and React Native tooling. At least one of those findings, `image-size`, is reported by the registry as having no patched release. The artifact is therefore retained as the authoritative, time-stamped record; these findings must not be silently suppressed or represented as resolved.

## Maintainer action

Review the `production-dependency-audit` artifact for each run. Upgrade Expo/React Native toolchain packages when their compatible releases remove the reported transitive packages, or document a formal risk acceptance with the affected scope and review date.
