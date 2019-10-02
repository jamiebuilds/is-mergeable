# is-mergeable

> Check if a GitHub Pull Request is in a (most likely) mergeable state

## Install

```sh
npm install --global is-mergeable
```

## Usage

```sh
GITHUB_API_TOKEN="$TOKEN" is-mergeable \
  --owner jamiebuilds \
  --repo is-mergeable \
  --pull-request 14 \
  --min-reviews 1
  --check ci-tests

# [ Open ] Updating Documentation (jamiebuilds/is-mergeable#14)
# @jamiebuilds wants to merge 1 commit into `master` from `update-docs`
# https://github.com/jamiebuilds/is-mergeable/pull/14
#
#   ✓ Open
#   ✓ Mergeable
#   ✓ Rebaseable
#   ✗ Reviews: (0 approved, 1 requested changes, 1 pending)
#     ✗ @user1 requested changes
#     • @user2 pending reviewer
#   ✓ Checks: (1 successes, 1 failures, 0 pending)
#     ✓ ci-tests success
#     ✗ ci-build failure
#
#  ✗ jamiebuilds/is-mergeable#14 is not ready to be merged.
```

> **Note:** `GITHUB_API_TOKEN` needs (at least) read privileges of your repo
> and have the `repo` scope.
