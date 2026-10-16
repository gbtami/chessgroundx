#!/usr/bin/env bash
# Non-destructive upstream merge reconnaissance. Run from any directory.
set -euo pipefail

repo="$(git rev-parse --show-toplevel)"
cd "$repo"
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Working tree must be clean (commit or stash changes first).' >&2
  exit 1
fi
if ! git remote get-url upstream >/dev/null 2>&1; then
  git remote add upstream https://github.com/lichess-org/chessground.git
fi
git fetch --no-tags upstream
upstream_ref="$(git symbolic-ref -q --short refs/remotes/upstream/HEAD || true)"
if [[ -z "$upstream_ref" ]]; then
  git remote set-head upstream -a >/dev/null
  upstream_ref="$(git symbolic-ref -q --short refs/remotes/upstream/HEAD || true)"
fi
if [[ -z "$upstream_ref" ]]; then
  echo 'Could not resolve upstream default branch.' >&2
  exit 1
fi
fork_sha="$(git rev-parse HEAD)"
upstream_sha="$(git rev-parse "$upstream_ref")"
merge_base="$(git merge-base "$fork_sha" "$upstream_sha" || true)"
report_dir="${1:-$repo/../chessgroundx-upstream-trial}"
mkdir -p "$report_dir"
report_dir="$(cd "$report_dir" && pwd)"
worktree="$(mktemp -d "${TMPDIR:-/tmp}/cgx-merge-XXXXXX")"
cleanup() {
  git -C "$repo" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  rmdir "$worktree" >/dev/null 2>&1 || true
}
trap cleanup EXIT
{
  echo "fork_HEAD=$fork_sha"
  echo "upstream_ref=$upstream_ref"
  echo "upstream_HEAD=$upstream_sha"
  echo "merge_base=${merge_base:-NONE}"
  if [[ -n "$merge_base" ]]; then
    echo "ahead_behind=$(git rev-list --left-right --count "$fork_sha...$upstream_sha")"
  fi
} > "$report_dir/metadata.txt"
git diff --name-status "$fork_sha" "$upstream_sha" > "$report_dir/tree-differences.txt"
if [[ -n "$merge_base" ]]; then
  git diff --name-status "$merge_base" "$upstream_sha" > "$report_dir/upstream-changes-since-base.txt"
  git diff --name-status "$merge_base" "$fork_sha" > "$report_dir/fork-changes-since-base.txt"
  for path in src/premove.ts src/predrop.ts src/fen.ts src/pocket.ts; do
    git log --format='%h %s' "$merge_base..$upstream_sha" -- "$path" > "$report_dir/upstream-$(basename "$path" .ts)-commits.txt"
  done
fi
git worktree add --detach "$worktree" "$fork_sha" >/dev/null
set +e
git -C "$worktree" merge --no-commit --no-ff "$upstream_sha" > "$report_dir/merge-output.txt" 2>&1
merge_exit=$?
set -e
printf 'merge_exit=%s\n' "$merge_exit" >> "$report_dir/metadata.txt"
git -C "$worktree" status --short > "$report_dir/merge-status.txt"
git -C "$worktree" diff --name-only --diff-filter=U > "$report_dir/conflicts.txt"
git -C "$worktree" diff --cached --name-status > "$report_dir/staged-auto-merges.txt"
git -C "$worktree" ls-files -u > "$report_dir/unmerged-index.txt"
for path in src/premove.ts src/predrop.ts src/fen.ts src/pocket.ts; do
  if [[ -f "$worktree/$path" ]] && ! git -C "$worktree" ls-files -u -- "$path" | grep -q .; then
    if cmp -s "$repo/$path" "$worktree/$path"; then
      echo "$path: unchanged" >> "$report_dir/fork-owned-status.txt"
    else
      echo "$path: CHANGED BY MERGE - preserve fork implementation during real resolution" >> "$report_dir/fork-owned-status.txt"
    fi
  else
    echo "$path: conflicted or absent - preserve fork implementation" >> "$report_dir/fork-owned-status.txt"
  fi
done
printf 'Trial completed; master is untouched. Report: %s\n' "$report_dir"
printf 'Merge exit: %s; unmerged paths: %s\n' "$merge_exit" "$(wc -l < "$report_dir/conflicts.txt")"
