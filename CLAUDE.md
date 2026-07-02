# Claude Code — Project Rules

## Branch policy
- Branch off `main` for every task (e.g. `chore/...`, `qa/...`, `feat/...`)
- Open a pull request to `main`; never push directly to `main`
- The operator reviews and merges via the GitHub UI (Squash + delete branch)

## Session startup — run these commands every time
git checkout main && git pull origin main

## Workflow for every task
1. git checkout main
2. git pull origin main
3. git checkout -b <type>/<short-description>
4. Make changes
5. git add .
6. git commit -m "description"
7. git push -u origin <branch>
8. Open a PR to main; the operator reviews and merges (Squash + delete branch)

## Why
This project uses a branch + PR + operator-merge workflow (the ratified
four-actor model). Changes reach `main` only through a reviewed PR merged by
the operator via the GitHub UI; direct pushes to `main` are not used.

## Deploy
Vite root is app/ — never edit app/index.html directly.
Deploy is Vercel-only: Vercel builds from source via vercel.json (npm run build → dist/).
Nothing is copied to repo root; there are no committed build artifacts.
Source entry: app/index.html  |  vite.config.ts root: app  |  outDir: ../dist
