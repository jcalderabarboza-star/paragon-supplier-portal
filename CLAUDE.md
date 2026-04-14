# Claude Code — Project Rules

## Branch policy
- Work directly on `main` branch only
- Never create feature branches
- Never create pull requests
- Always push directly to `main`

## Session startup — run these commands every time
git checkout main && git pull origin main

## Workflow for every task
1. git checkout main
2. git pull origin main  
3. Make changes
4. git add .
5. git commit -m "description"
6. git push origin main

## Why
This is a solo project with no team and no code review process.
The owner has explicitly configured main as the only working branch.
GitHub Pages deploys automatically from main.

## After every commit — mandatory
Always rebuild and commit dist before pushing:
1. npm install (if node_modules missing)
2. npm run build
3. git add dist -f
4. git commit -m "build: rebuild dist"
5. git push origin main

## GitHub Pages configuration
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)
- Built files must be copied to repo root (index.html, assets/, favicon.ico)
- After any change: rebuild dist, copy to root, commit, push to main
- If changes don't appear on live site, check Settings → Pages and verify the source is saved correctly
