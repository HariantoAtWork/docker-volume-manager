#!/bin/sh
# Enter the host namespaces of PID 1, then start Harbour.
# Equivalent to: docker run --privileged --pid=host ... nsenter -t 1 -m -u -n -i -- bun .output/server/index.mjs
#
# nsenter -m switches this process into the host mount namespace, so image
# paths such as /app disappear. A pause process stays in the container mount
# namespace; we exec bun from /proc/<pid>/root/... which still points at the image.
set -eu

APP_SERVER="/app/.output/server/index.mjs"
BUN_BIN="$(command -v bun || echo /usr/local/bin/bun)"
NSENTER_BIN="$(command -v nsenter || true)"

# Compose may pass the full nsenter command; strip it so we wrap it ourselves.
if [ "${1:-}" = "nsenter" ]; then
  while [ "$#" -gt 0 ]; do
    arg="$1"
    shift
    [ "$arg" = "--" ] && break
  done
fi

if [ "$#" -eq 0 ]; then
  set -- bun "$APP_SERVER"
fi

if [ -z "$NSENTER_BIN" ] || [ ! -e /proc/1/ns/mnt ]; then
  exec "$@"
fi

# Already looking at the host's Docker data (e.g. restarted in host mount ns).
if [ -d /var/lib/docker/volumes ]; then
  exec "$@"
fi

if ! "$NSENTER_BIN" -t 1 -m -u -n -i -- /bin/true >/dev/null 2>&1; then
  echo "harbour: nsenter into PID 1 failed; starting in the container namespace" >&2
  echo "harbour: file browsing will fall back to VOLUME_PATH or a helper container" >&2
  exec "$@"
fi

sleep infinity &
KEEP_PID=$!
ROOT="/proc/${KEEP_PID}/root"

case "$1" in
  bun)
    APP_BIN="${ROOT}${BUN_BIN}"
    shift
    ;;
  *)
    APP_BIN="${ROOT}$1"
    shift
    ;;
esac

if [ "$#" -eq 0 ]; then
  set -- "$APP_SERVER"
fi

SERVER="$1"
case "$SERVER" in
  .output/*)
    SERVER="${ROOT}/app/${SERVER}"
    ;;
  /app/*)
    SERVER="${ROOT}${SERVER}"
    ;;
esac
shift

CHILD_PID=""
cleanup() {
  if [ -n "$CHILD_PID" ]; then
    kill "$CHILD_PID" 2>/dev/null || true
    wait "$CHILD_PID" 2>/dev/null || true
  fi
  kill "$KEEP_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$NSENTER_BIN" -t 1 -m -u -n -i -w "${ROOT}/app" -- "$APP_BIN" "$SERVER" "$@" &
CHILD_PID=$!

set +e
wait "$CHILD_PID"
status=$?
set -e

CHILD_PID=""
trap - EXIT INT TERM
kill "$KEEP_PID" 2>/dev/null || true
exit "$status"
