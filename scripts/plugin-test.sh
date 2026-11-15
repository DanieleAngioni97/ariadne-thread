#!/bin/sh
# Validates and tests the plugin as people install it: only the files git tracks or would add,
# copied apart, so the evaluation's untracked projects in eval/out/ stay out of the run.
set -e
root=$(git rev-parse --show-toplevel)
copy=$(mktemp -d)
trap 'rm -rf "$copy"' EXIT
git -C "$root" ls-files -co --exclude-standard -z | (cd "$root" && xargs -0 tar -cf -) | tar -xf - -C "$copy"
claude plugin validate "$copy"
claude plugin test "$copy"
