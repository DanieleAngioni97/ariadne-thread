#!/usr/bin/env bash
# Release the plugin in one go: checks, version bump, main fast-forwarded and pushed, local plugin updated.
#   scripts/release.sh <version> [--dry-run]
# Run it on the work branch with a clean tree. --dry-run runs the checks and prints what it would change.
set -euo pipefail

version="${1:-}"
dry=false
[ "${2:-}" = "--dry-run" ] && dry=true
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "usage: scripts/release.sh <x.y.z> [--dry-run]" >&2; exit 2; }

cd "$(git rev-parse --show-toplevel)"
run() { if $dry; then echo "would run: $*"; else "$@"; fi; }

branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" != "main" ] || { echo "release from the work branch, not main" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "the tree is not clean: commit first" >&2; exit 1; }
current="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' .claude-plugin/plugin.json)"
[ "$version" != "$current" ] || { echo "the plugin is already at $version" >&2; exit 1; }
git merge-base --is-ancestor main HEAD || { echo "main has commits this branch lacks: merge or rebase first" >&2; exit 1; }

echo "== checks"
node --test src/*.test.mjs bin/*.test.mjs hooks/*.test.mjs scripts/ariadne/*.test.mjs viewer/*.test.mjs eval/*.test.mjs >/dev/null
node bin/ariadne.mjs validate
scripts/plugin-test.sh >/dev/null
echo "tests, graph and plugin: ok"

echo "== $current -> $version on $branch"
thread="$(node -e "console.log(JSON.parse(require('fs').readFileSync('.ariadne/thread.json','utf8')).current ?? '')")"
trailer=""
[ -n "$thread" ] && trailer=$'\n\n'"Thread: $thread"
run sed -i.bak "s/\"version\": \"$current\"/\"version\": \"$version\"/" .claude-plugin/plugin.json
run rm -f .claude-plugin/plugin.json.bak
run git add .claude-plugin/plugin.json
run git commit -q -m "chore(release): bump the plugin to $version$trailer"
# Outside Claude Code no hook records the commit: sync does, and the graph goes in its own commit.
if ! $dry; then
  node bin/ariadne.mjs sync
  if [ -n "$(git status --porcelain .ariadne)" ]; then
    git add .ariadne
    git commit -q -m "chore(ariadne): record the $version release as proof$trailer"
  fi
fi

echo "== main"
run git checkout -q main
run git merge -q --ff-only "$branch"
run git checkout -q "$branch"
run git push origin main
run git push origin "$branch"

echo "== local plugin"
if command -v claude >/dev/null; then
  run claude plugin marketplace update ariadne-thread
  run claude plugin update ariadne@ariadne-thread
  echo "done: in Claude Code run /reload-plugins; restart \`ariadne view\` and reload the page"
else
  echo "claude not found: in Claude Code run /plugin marketplace update ariadne-thread, then update ariadne"
fi
