#!/usr/bin/env bash
# Local mirror of .github/workflows/deploy.yml — build with podman and run the same pod layout.
#
# Usage (from repo root):
#   ./scripts/deploy-local-podman.sh
#   ./scripts/deploy-local-podman.sh --build-only
#   TARGET=main ./scripts/deploy-local-podman.sh
#
set -euo pipefail
[[ "${TRACE:-0}" == 1 ]] && set -x

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_DIR="${APP_DIR:-/home/dedalo43/slcfrontend-app}"
APP_DIR="${APP_DIR/#\~/$HOME}"
TARGET="${TARGET:-development}"

POD_NAME="${POD_NAME:-slcfrontend-pod}"
APP_CONTAINER_NAME="${APP_CONTAINER_NAME:-slcfrontend-container}"
NGINX_CONTAINER_NAME="${NGINX_CONTAINER_NAME:-slcfrontend-nginx}"
APP_PORT="${APP_PORT:-10443}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-120}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"
USE_LOCAL_RESOLVE="${USE_LOCAL_RESOLVE:-1}"

REGISTRY="localhost"
DOMAIN_MAIN="slc.identyclaw.com"
DOMAIN_DEVELOPMENT="slc.dihola.io"

RUN_BUILD=1
RUN_DEPLOY=1

usage() {
  sed -n '1,20p' "$0"
}

for arg in "$@"; do
  case "$arg" in
    --build-only) RUN_DEPLOY=0 ;;
    --deploy-only|--skip-build) RUN_BUILD=0 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

if command -v git >/dev/null 2>&1 && git -C "$REPO_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
  DEFAULT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
else
  DEFAULT_SHA="local"
fi
DEPLOY_SHA="${DEPLOY_SHA:-$DEFAULT_SHA}"

case "$TARGET" in
  development)
    NGINX_BUILD_ENV="development"
    APP_BUILD_ENV="development"
    DOMAIN="${DOMAIN:-$DOMAIN_DEVELOPMENT}"
    ;;
  main)
    NGINX_BUILD_ENV="main"
    APP_BUILD_ENV="main"
    DOMAIN="${DOMAIN:-$DOMAIN_MAIN}"
    ;;
  *)
    echo "TARGET must be 'development' or 'main' (got: $TARGET)" >&2
    exit 1
    ;;
esac

APP_IMAGE_NAME="slcfrontend-app"
NGINX_IMAGE_NAME="slcfrontend-nginx"
APP_IMAGE="${REGISTRY}/${APP_IMAGE_NAME}:${DEPLOY_SHA}"
NGINX_IMAGE="${REGISTRY}/${NGINX_IMAGE_NAME}:${DEPLOY_SHA}"

cd "$REPO_ROOT"

build_images() {
  echo "==> [build-images] Build React app image"
  podman build -f react.Dockerfile \
    --build-arg "APP_BUILD_ENV=${APP_BUILD_ENV}" \
    -t "${APP_IMAGE}" \
    -t "${REGISTRY}/${APP_IMAGE_NAME}:latest" \
    "${REPO_ROOT}"

  echo "==> [build-images] Build Nginx image"
  podman build -f nginx.Dockerfile \
    --build-arg "NODE_ENV=${NGINX_BUILD_ENV}" \
    -t "${NGINX_IMAGE}" \
    -t "${REGISTRY}/${NGINX_IMAGE_NAME}:latest" \
    "${REPO_ROOT}"
}

setup_directories() {
  echo "==> [test-and-deploy] Setup directories"
  mkdir -p "${APP_DIR}/"{certs,logs,data,nginx,secrets}
  mkdir -p "${APP_DIR}/logs/nginx"
  chmod 711 "${APP_DIR}/certs" || true
  chmod 750 "${APP_DIR}/secrets" || true
  chmod 0775 "${APP_DIR}/logs/nginx" || true
  podman unshare chown -R 101:101 "${APP_DIR}/logs/nginx" || true
}

deploy_containers() {
  echo "==> [test-and-deploy] Deploy containers"
  set -euo pipefail
  cd "$APP_DIR"

  podman pod exists "$POD_NAME" && podman pod rm -f "$POD_NAME" || true

  podman image exists "$APP_IMAGE" || { echo "Missing image: $APP_IMAGE" >&2; exit 1; }
  podman image exists "$NGINX_IMAGE" || { echo "Missing image: $NGINX_IMAGE" >&2; exit 1; }

  podman pod create --name "$POD_NAME" -p "${APP_PORT}:${APP_PORT}"

  podman run -d \
    --log-driver=k8s-file \
    --pod "$POD_NAME" \
    --name "$APP_CONTAINER_NAME" \
    --restart=unless-stopped \
    "$APP_IMAGE"

  mkdir -p "${APP_DIR}/logs/nginx"
  chmod 0775 "${APP_DIR}/logs/nginx" || true
  podman unshare chown -R 101:101 "${APP_DIR}/logs/nginx" || true

  chmod 711 "${APP_DIR}/certs" || true
  CERT_DIR="${APP_DIR}/certs"
  for f in privkey.pem tls.key; do
    if [[ -f "${CERT_DIR}/${f}" ]]; then
      podman unshare chown 101:101 "${CERT_DIR}/${f}" || true
      podman unshare chmod 600 "${CERT_DIR}/${f}" || true
    fi
  done
  for f in fullchain.pem chain.pem cert.pem tls.crt; do
    if [[ -f "${CERT_DIR}/${f}" ]]; then
      podman unshare chown 101:101 "${CERT_DIR}/${f}" || true
      podman unshare chmod 644 "${CERT_DIR}/${f}" || true
    fi
  done

  podman run -d \
    --log-driver=k8s-file \
    --pod "$POD_NAME" \
    --name "$NGINX_CONTAINER_NAME" \
    --restart=unless-stopped \
    -v "${APP_DIR}/certs:/app/certs:ro,Z" \
    -v "${APP_DIR}/logs/nginx:/var/log/nginx:Z" \
    "$NGINX_IMAGE"

  podman ps -a
  podman logs "$APP_CONTAINER_NAME" || true
  podman logs "$NGINX_CONTAINER_NAME" || true
}

verify_deployment() {
  echo "==> [test-and-deploy] Verify deployment"
  SITE_URL="https://${DOMAIN}:${APP_PORT}/"
  echo "Probing: ${SITE_URL}"

  curl_site() {
    if [[ "$USE_LOCAL_RESOLVE" == 1 ]]; then
      curl -sk -m 5 --resolve "${DOMAIN}:${APP_PORT}:127.0.0.1" "$@"
    else
      curl -sk -m 5 "$@"
    fi
  }

  local elapsed=0
  while [[ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]]; do
    code=$(curl_site -o /dev/null -w "%{http_code}" "${SITE_URL}" 2>/dev/null || echo "000")
    case "${code}" in
      200|301|302|304)
        echo "Site responded with HTTP ${code}"
        return 0
        ;;
    esac
    echo "Verify attempt (last HTTP ${code})"
    sleep "$HEALTH_CHECK_INTERVAL"
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
  done
  return 1
}

echo "==> Local deploy"
echo "    APP_DIR=$APP_DIR TARGET=$TARGET DEPLOY_SHA=$DEPLOY_SHA DOMAIN=$DOMAIN"

if [[ "$RUN_BUILD" -eq 1 ]]; then
  build_images
fi

if [[ "$RUN_DEPLOY" -eq 0 ]]; then
  echo "==> Build-only finished"
  exit 0
fi

setup_directories
deploy_containers

if verify_deployment; then
  echo "==> Local deploy finished successfully"
  exit 0
fi

echo "Verify manually: curl -sk --resolve \"${DOMAIN}:${APP_PORT}:127.0.0.1\" \"https://${DOMAIN}:${APP_PORT}/\"" >&2
exit 1
