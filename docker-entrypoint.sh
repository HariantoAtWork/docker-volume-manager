#!/bin/sh
# Enter PID 1's mount namespace only, then start Harbour in the container netns.
# Equivalent to: docker run --privileged --pid=host ... nsenter -t 1 -m -- bun ...
#
# nsenter -m switches this process into the host mount namespace, so image
# paths such as /app disappear. Bun is musl-linked, so we cannot exec
# /usr/local/bin/bun (host has no ld-musl) or treat WORKDIR /app as a binary.
# util-linux also treats `-w DIR` as "optional arg", so DIR becomes PROGRAM
# (exit 126 on the directory). Use --wdns=DIR (equals form) and exec the musl
# loader plus bun plus index.mjs from a host-visible, executable path.
#
# Do not pass nsenter -n/-u/-i: the app must keep the container network
# namespace so Compose port publish (e.g. 5555:3000) reaches Nitro.
set -eu

APP_SERVER="/app/.output/server/index.mjs"
BUN_BIN="$(command -v bun || echo /usr/local/bin/bun)"
NSENTER_BIN="$(command -v nsenter || true)"
HOST_VIEW="/proc/1/root"
STAGE_DIR=""
KEEP_PID=""

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

if ! "$NSENTER_BIN" -t 1 -m -- /bin/true >/dev/null 2>&1; then
  echo "harbour: nsenter into PID 1 failed; starting in the container namespace" >&2
  echo "harbour: file browsing will fall back to VOLUME_PATH or a helper container" >&2
  exec "$@"
fi

# Stay in the container mount namespace (BusyBox sleep has no GNU "infinity").
tail -f /dev/null &
KEEP_PID=$!

case "$1" in
  bun)
    shift
    ;;
  *)
    BUN_BIN="$1"
    shift
    ;;
esac

if [ "$#" -eq 0 ]; then
  set -- "$APP_SERVER"
fi

SERVER="$1"
shift

host_visible_root() {
  short="$(cat /etc/hostname 2>/dev/null || true)"
  if [ -n "$short" ]; then
    for d in "$HOST_VIEW/var/lib/docker/rootfs/overlayfs/${short}"*; do
      if [ -x "$d/usr/local/bin/bun" ] && [ -f "$d/app/.output/server/index.mjs" ]; then
        printf '%s\n' "${d#"$HOST_VIEW"}"
        return 0
      fi
    done
  fi
  for d in "$HOST_VIEW/var/lib/docker/overlay2/"*/merged; do
    if [ -x "$d/usr/local/bin/bun" ] && [ -f "$d/app/.output/server/index.mjs" ]; then
      printf '%s\n' "${d#"$HOST_VIEW"}"
      return 0
    fi
  done
  return 1
}

musl_ld() {
  fs_root="$1"
  for cand in /lib/ld-musl-*.so.1; do
    if [ -e "$cand" ]; then
      printf '%s\n' "${fs_root}${cand}"
      return 0
    fi
  done
  return 1
}

stage_copy() {
  for base in /opt /var/lib /root; do
    dest="${HOST_VIEW}${base}/harbour-$$"
    mkdir -p "$dest/lib" "$dest/usr/lib" "$dest/usr/local/bin" "$dest/app" || continue
    if ! cp -a /lib/ld-musl-*.so.1 "$dest/lib/" 2>/dev/null; then
      rm -rf "$dest"
      continue
    fi
    chmod +x "$dest"/lib/ld-musl-*.so.1
    ld_host=""
    for cand in "$dest"/lib/ld-musl-*.so.1; do
      [ -e "$cand" ] || continue
      ld_host="${cand#"$HOST_VIEW"}"
      break
    done
    if [ -z "$ld_host" ] || ! "$NSENTER_BIN" -t 1 -m -- "$ld_host" --help >/dev/null 2>&1; then
      rm -rf "$dest"
      continue
    fi
    cp -a /usr/lib/libstdc++.so.6* /usr/lib/libgcc_s.so.1* "$dest/usr/lib/" 2>/dev/null || true
    cp "$BUN_BIN" "$dest/usr/local/bin/bun"
    chmod +x "$dest/usr/local/bin/bun"
    cp -a /app/.output "$dest/app/.output"
    STAGE_DIR="$dest"
    printf '%s\n' "${base}/harbour-$$"
    return 0
  done
  echo "harbour: no executable host path to stage bun (tmpfs is often noexec)" >&2
  return 1
}

map_server() {
  fs_root="$1"
  case "$SERVER" in
    .output/*)
      printf '%s\n' "${fs_root}/app/${SERVER}"
      ;;
    /app/*)
      printf '%s\n' "${fs_root}${SERVER}"
      ;;
    /*)
      printf '%s\n' "${fs_root}${SERVER}"
      ;;
    *)
      printf '%s\n' "${fs_root}/app/${SERVER}"
      ;;
  esac
}

FS_ROOT="$(host_visible_root || stage_copy)"
APP_BIN="${FS_ROOT}${BUN_BIN}"
case "$BUN_BIN" in
  /*) ;;
  *) APP_BIN="${FS_ROOT}/usr/local/bin/bun" ;;
esac
SERVER="$(map_server "$FS_ROOT")"
WD="${FS_ROOT}/app"
MUSL_LD="$(musl_ld "$FS_ROOT" || true)"
LIBPATH="${FS_ROOT}/lib:${FS_ROOT}/usr/lib"

CHILD_PID=""
cleanup() {
  if [ -n "$CHILD_PID" ]; then
    kill "$CHILD_PID" 2>/dev/null || true
    wait "$CHILD_PID" 2>/dev/null || true
  fi
  if [ -n "$KEEP_PID" ]; then
    kill "$KEEP_PID" 2>/dev/null || true
  fi
  if [ -n "$STAGE_DIR" ]; then
    rm -rf "$STAGE_DIR"
  fi
}
trap cleanup EXIT INT TERM

# --wdns= must be attached: `-W DIR` / `-w DIR` makes DIR the program (exit 126).
# Mount ns only: stay in the container netns so published ports work.
if [ -n "$MUSL_LD" ]; then
  "$NSENTER_BIN" -t 1 -m --wdns="$WD" -- \
    "$MUSL_LD" --library-path "$LIBPATH" \
    "$APP_BIN" "$SERVER" "$@" &
else
  "$NSENTER_BIN" -t 1 -m --wdns="$WD" -- \
    "$APP_BIN" "$SERVER" "$@" &
fi
CHILD_PID=$!

set +e
wait "$CHILD_PID"
status=$?
set -e

CHILD_PID=""
trap - EXIT INT TERM
cleanup
exit "$status"
