# Contributing to OmniWave

Thank you for improving OmniWave. The project is a **local-first** music player: contributions must keep listeners’ audio files, paths, listening history, and preferences on their device unless a change is explicitly approved and documented.

## Start locally

Use the current Node and pnpm versions defined by the repository, then install dependencies and start the Expo development server.

```bash
pnpm install
pnpm dev
```

Before opening a pull request, run all quality gates.

```bash
pnpm check
pnpm test
pnpm lint
```

## Contribution boundaries

Keep the product free of accounts, cloud synchronization, advertising, and external analytics unless the project scope explicitly changes. Validate every local metadata value and URI before it is stored or played. Do not add audio files, local paths, exported histories, credentials, tokens, or personal listening data to commits, screenshots, issues, or pull requests.

## Experience standards

Preserve portrait-first layouts, Arabic RTL support, and all four interface languages when changing user-facing copy. Every control needs an accessible label and must remain understandable without relying only on color or gesture. Respect the operating system’s reduced-motion preference: use a concise static fallback for every new animation.

## Pull requests

Keep a pull request focused on one user outcome. Describe the behavior, privacy impact, localization changes, and test evidence. Add or update a Vitest contract when a flow, persistence rule, export boundary, or accessible control changes. Native-only behavior—including background audio, lock-screen controls, sharing, and date selection—must be validated on iOS and Android before it is claimed as verified.

## Reporting issues

Use the repository Issue Forms for bugs and feature ideas. Redact audio files, URIs, paths, tokens, device identifiers, and personal metadata. Feature proposals should state their local-data, RTL, and reduced-motion implications.
