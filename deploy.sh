#!/usr/bin/env bash
#
# Deploy the DBL HRM frontend on the server.
#
#   ./deploy.sh                      # build in place
#   WEB_ROOT=/var/www/hrm ./deploy.sh   # build, then publish to the web root
#
# Pulls main, installs locked dependencies and builds to dist/. If WEB_ROOT is
# set (or read from .deploy-target, see below) the built assets are copied
# there; otherwise the script stops after the build and tells you where dist/
# is, because guessing a web root and writing to it is not something a deploy
# script should do on its own.
#
# To avoid passing WEB_ROOT every time, write it once on the server:
#     echo /var/www/hrm > .deploy-target
# That file is gitignored — it is a property of the machine, not the codebase.

set -euo pipefail

cd "$(dirname "$0")"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mdeploy failed:\033[0m %s\n' "$1" >&2; exit 1; }

# ── Preflight ───────────────────────────────────────────────────────────────

# The API base URL is baked into the bundle at build time, so a missing or
# localhost .env produces a build that silently talks to nobody. Worth one
# check here rather than a white screen in production.
[ -f .env ] || die ".env is missing. VITE_API_BASE_URL is compiled into the bundle, so the build needs it."

if grep -qE '^VITE_API_BASE_URL=.*localhost' .env; then
  die "VITE_API_BASE_URL still points at localhost. That URL is baked into the bundle — fix .env first."
fi

if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "the working tree has uncommitted changes. Commit, stash or discard them first."
fi

# ── Pull ────────────────────────────────────────────────────────────────────

say "Fetching main"
git fetch origin main
before="$(git rev-parse HEAD)"
git merge --ff-only origin/main || die "cannot fast-forward — this checkout has diverged from origin/main."
after="$(git rev-parse HEAD)"

if [ "$before" = "$after" ]; then
  say "Already up to date at $(git rev-parse --short HEAD) — rebuilding anyway"
else
  say "Updated $(git rev-parse --short "$before") → $(git rev-parse --short "$after")"
  git --no-pager log --oneline "$before..$after" | sed 's/^/    /'
fi

# ── Build ───────────────────────────────────────────────────────────────────

say "Installing dependencies (locked)"
npm ci

say "Building"
npm run build

[ -f dist/index.html ] || die "the build produced no dist/index.html."

# ── Publish ─────────────────────────────────────────────────────────────────

target="${WEB_ROOT:-}"
if [ -z "$target" ] && [ -f .deploy-target ]; then
  target="$(tr -d '[:space:]' < .deploy-target)"
fi

if [ -z "$target" ]; then
  say "Built to $(pwd)/dist"
  printf '\nNo WEB_ROOT set, so nothing was published. Point your web server at that\n'
  printf 'directory, or set the target once with:\n\n    echo /var/www/hrm > .deploy-target\n\n'
  exit 0
fi

[ -d "$target" ] || die "WEB_ROOT '$target' does not exist."

# --delete so a file removed from the build is removed from the server too; a
# stale chunk left behind is exactly the kind of thing that only breaks for the
# one person whose browser still asks for it.
say "Publishing to $target"
rsync -a --delete dist/ "$target/"

say "Done — $(git rev-parse --short HEAD) is live at $target"
printf '\nA hard refresh may be needed if the browser cached index.html.\n\n'
