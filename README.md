
# Quanta Control

<img width="1484" height="1004" alt="quanta-control-1" src="https://github.com/user-attachments/assets/bd9cf9c7-edf0-4326-a56f-ed17443770b5" />


Quanta Control is a local-first Git workbench for people who want a focused desktop UI for day-to-day repository work without leaving the normal Git and GitHub tooling they already use.

It runs on your machine, talks to your repositories through the system `git` executable, and gives you a clean interface for reviewing changes, committing, switching branches, checking history, and working with remotes.

I initially built this project for myself as a companion to AI coding tools such as OpenCode or Codex which don't natively support git source control like IDEs such as VS Code or Zed. 

Quanta Control follows the same lightweight, low-fuss philosophy employed by CLI coding tools. 

## What it does

Quanta Control is built around a few common Git workflows:

- inspect working tree changes and staged files
- review diffs before committing
- stage, unstage, discard, and ignore files
- create commits and push them upstream
- switch, create, and delete branches
- inspect commit history
- fetch, pull, and push remotes
- verify local Git and GitHub readiness with a pre-flight checklist before opening a repo

The app is intended to complement normal CLI-based development, not replace it. It uses your existing local Git configuration, credentials, and remote setup.

## How it works

Quanta Control is not a hosted service and it does not proxy your repositories through a cloud backend.

- repositories stay on your machine
- Git operations are executed through the local `git` binary
- GitHub access uses your normal local credentials
- the app reads your environment and Git config rather than inventing its own auth system

If you already work with `git`, `gh`, SSH remotes, or HTTPS remotes locally, Quanta Control is designed to fit into that setup.

## Features

### Repository opener

- open a repo by path
- browse directories to find a repository
- reuse recent repositories
- adjust startup defaults before opening a repo

### Changes and diff review

- view modified, staged, untracked, renamed, and conflicted files
- see addition and deletion counts per file
- inspect diffs in the main workspace
- stage and unstage individual files
- discard changes
- add files or patterns to `.gitignore`

### Commits and remotes

- write commit messages and create commits from the UI
- optionally push immediately after a commit
- fetch, pull, and push using the current repo's remotes
- see ahead/behind status from the current branch

### Branches and history

- list local and remote branches
- switch branches
- create new branches
- delete branches
- inspect recent commit history

### Pre-flight checklist

Before opening a repo, the app can check:

- whether `git` is installed
- whether GitHub CLI is installed
- whether GitHub CLI is authenticated
- whether your Git identity is configured

That checklist stays useful after initial setup because it gives you a quick sanity check that your local environment is ready before you start working.

## Requirements

- Node.js 20+
- `git`
- `curl` and `tar` for the hosted installer

Optional but recommended:

- `gh` for the smoothest GitHub authentication flow

## Install

Install from GitHub with:

```bash
curl -fsSL https://raw.githubusercontent.com/unmodeled-tyler/quanta-control/main/scripts/install.sh | bash
```

The installer:

- downloads the app into `~/.local/share/quanta-control`
- installs dependencies
- builds the production frontend and backend
- creates a launcher at `~/.local/bin/quanta-control`

If `~/.local/bin` is not already on your `PATH`, add it to your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then start the app with:

```bash
quanta-control
```

## GitHub setup

Quanta Control does not create or store a separate GitHub auth model. It uses the same local credentials your Git tools already use.

The simplest GitHub setup is:

```bash
gh auth login
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

If you prefer SSH or HTTPS remotes without GitHub CLI, that works too. The app's pre-flight checklist will tell you what is available on the current machine.

## Usage

Typical flow:

1. Launch `quanta-control`
2. Check the pre-flight panel
3. Open a local repository
4. Review changes and diffs
5. Commit, branch, fetch, pull, or push as needed

The app is especially useful when you want a faster visual pass over repository state while still keeping your normal terminal-based workflow.

## Development

Install dependencies:

```bash
npm install
```

Run the standard dev servers:

```bash
npm run dev
```

Run the production build locally:

```bash
npm run build
npm start
```

Run the compiled production launcher:

```bash
npm run start:cli
```

Run the repo-local desktop dev launcher:

```bash
npm run dev:cli
```

That launcher starts the local API server and Vite client, then opens Quanta Control in a minimal Electron window for testing.

## Notes

- Quanta Control is currently centered on local repository operations, not GitHub PR review or hosted account management.
- The app depends on your system Git installation being available in `PATH`.
- GitHub CLI is optional, but it improves first-run GitHub connectivity for most users.

## License

[MIT](./LICENSE)
