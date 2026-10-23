#!/usr/bin/env bash
# Release notes for a GitHub release, in the style of the gtm repo: the
# version, the commits that went into it, the new contributors, and a link to
# the full diff.
#
#   scripts/build/release-notes.sh <from-ref> <to-ref> <version> [out]
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
from="${1:?from-ref required}"
to="${2:?to-ref required}"
version="${3:?version required}"
out="${4:-$repo_root/artifacts/release-notes.md}"

cd "$repo_root"

repo_url="$(git config --get remote.origin.url | sed -E 's#(\.git)?$##; s#^git@github.com:#https://github.com/#; s#^git://#https://github.com/#')"

is_bot() {
  [[ "$2" =~ (\-bot|\[bot\])@ ]] && return 0
  [[ "$1" == *"[bot]"* ]] && return 0
  [[ "$3" == *"[skip ci]"* ]] && return 0
  [[ "$3" =~ ^(Merge|pull\ request\ from) ]] && return 0
  return 1
}

handle() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

commits="$(git log --format='%H|%aN|%aE|%s' "${from}..${to}" 2>/dev/null || true)"
if [[ -z "$commits" && "$from" == "$to" ]]; then
  commits="$(git log -1 --format='%H|%aN|%aE|%s' "${to}" 2>/dev/null || true)"
fi

human=()
while IFS='|' read -r sha name email subject; do
  [[ -n "$sha" ]] || continue
  is_bot "$name" "$email" "$subject" && continue
  human+=("${sha}|${name}|${email}|${subject}")
done <<<"$commits"

if [[ ${#human[@]} -eq 0 ]]; then
  echo "warning: no human commits between ${from}..${to}" >&2
fi

prior_authors="$(git log --format='%aE' "$from" 2>/dev/null | sort -u || true)"

new_handles=()
declare -A seen_new=()
for row in "${human[@]}"; do
  IFS='|' read -r _sha name email _subject <<<"$row"
  [[ -n "$email" ]] || continue
  grep -qxF -- "$email" <<<"$prior_authors" && continue
  h="$(handle "$name")"
  [[ -n "$h" ]] || continue
  [[ -n "${seen_new[$h]:-}" ]] && continue
  seen_new["$h"]=1
  new_handles+=("$h")
done

mkdir -p "$(dirname "$out")"
{
  echo "# gtm.nvim ${version}"
  echo
  for row in "${human[@]}"; do
    IFS='|' read -r sha _name _email subject <<<"$row"
    echo "- [\`${sha:0:7}\`](${repo_url}/commit/${sha}) ${subject}"
  done
  echo
  if [[ ${#new_handles[@]} -gt 0 ]]; then
    echo "### Contributors"
    echo
    for h in "${new_handles[@]}"; do
      echo "<a href=\"https://github.com/${h}\"><img src=\"https://github.com/${h}.png?size=80\" width=\"50\" height=\"50\" style=\"border-radius:50%;margin:4px;\" alt=\"${h}\"/></a>"
    done
    echo
  fi
  echo "**Full changelog**: ${repo_url}/compare/${from}...${to}"
} > "$out"

echo "wrote $out (${#new_handles[@]} new contributor(s), ${#human[@]} commit(s))"
