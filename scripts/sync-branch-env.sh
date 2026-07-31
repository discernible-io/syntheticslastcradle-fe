#!/bin/sh
# Copy the branch-authoritative env into transient .env for Vite/local tooling.
# Authoritative sources (committed): .env.main, .env.development
# Transient (gitignored): .env — never edit by hand; edit the authoritative file instead.
set -eu

REPO_ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
ENV="${APP_BUILD_ENV:-${NODE_ENV:-}}"

if [ -z "$ENV" ]; then
  if git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    branch="$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)"
    case "$branch" in
      main) ENV=main ;;
      development) ENV=development ;;
      *) ENV=main ;;
    esac
  else
    ENV=main
  fi
fi

# Vite uses NODE_ENV=production|development; map build tier names only for file selection.
case "$ENV" in
  main|production) ENV=main ;;
  development|dev) ENV=development ;;
  *)
    echo "sync-branch-env: tier must be 'main' or 'development', got '${ENV}'" >&2
    exit 1
    ;;
esac

AUTHORITATIVE="${REPO_ROOT}/.env.${ENV}"
if [ ! -f "$AUTHORITATIVE" ]; then
  echo "sync-branch-env: missing ${AUTHORITATIVE}" >&2
  exit 1
fi

cp "$AUTHORITATIVE" "${REPO_ROOT}/.env"

echo "sync-branch-env: .env <- .env.${ENV} (transient; edit .env.${ENV} to change config)"
