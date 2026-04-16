# Quanta Control

Quanta Control is a local-first Git workbench for people who want a clean UI for status, diffs, commits, branches, history, and remotes without giving up normal local Git and GitHub workflows.

It runs entirely on your machine. The app talks to your local repositories through the system `git` executable, and it serves a local web UI from a small Node/Express runtime.

## What changed for release readiness

- Production build now compiles both the frontend and backend.
- The backend serves the bundled frontend, so there is a single runtime entrypoint.
- A global `quanta-control` CLI launcher is included.
- A first-run environment checklist helps users verify Git, Node, GitHub CLI auth, and global Git identity.
- Installer and repo metadata were added so the project can be published cleanly on GitHub.

## Prerequisites

- Node.js 20+
- `git`
- `curl` and `tar` for the hosted installer
- `gh` is optional, but recommended for the easiest GitHub authentication flow

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/unmodeled-tyler/quanta-control/main/scripts/install.sh | bash
```

The installer will:

- download the app into `~/.local/share/quanta-control`
- build the production frontend and backend
- create a launcher at `~/.local/bin/quanta-control`

If `~/.local/bin` is not already on your `PATH`, add it to your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then launch the app with:

```bash
quanta-control
```

## GitHub setup

Quanta Control does not manage its own GitHub tokens. It uses your normal local Git and GitHub credentials. The recommended setup is:

```bash
gh auth login
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

If you prefer SSH or HTTPS credentials without GitHub CLI, that still works. The app's onboarding panel will show what is missing on the current machine.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

CLI launcher from the local checkout:

```bash
npm run start:cli
```

## Publish checklist

- Initialize the repo and push it to GitHub.
- Keep generated output (`dist`, `build`, `node_modules`) out of git; `.gitignore` now covers them.
- Optionally add screenshots and release notes before making the repository public.
