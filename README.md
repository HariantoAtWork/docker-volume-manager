# Harbour — Docker Volume Manager

Inspect Docker volumes, prune unused ones, and browse or edit the files they hold.

## Setup

```bash
bun install
cp .env.example .env
```

## Environment

| Variable | Purpose |
| --- | --- |
| `DOCKER_SOCKET` | Docker Engine socket (default `/var/run/docker.sock`). |
| `DOCKER_HOST` | Alternative daemon URL (`unix://` or `tcp://`). |
| `DOCKER_VOLUMES_DIR` | Optional override for the engine volumes directory (default `/var/lib/docker/volumes`). |
| `VOLUME_BIND` | Optional named volume to highlight as bound. Not required in Compose. |
| `VOLUME_PATH` | Optional directory where `VOLUME_BIND` is mounted in the app process. Used for local `bun run dev` if you bind a folder yourself. |
| `DVM_HELPER_IMAGE` | Image used to browse volumes when host volume data is not visible (default `alpine:3.21`). |

In Compose, Harbour nsenter's into host PID 1 (`privileged` + `pid: host`). Volume files are then read from `/var/lib/docker/volumes/<name>/_data`. The Docker socket is the host's `/var/run/docker.sock` — neither needs a bind-mount.

For local `bun run dev`, the process is not in the host mount namespace. Point `VOLUME_PATH` at a mounted folder, or leave it unset and browse through a helper container (requires a reachable Docker socket). First browse of an unmounted volume pulls `alpine:3.21` if it is not already present.

The process must run as root for nsenter. On Docker Desktop, PID 1 is the Linux VM, so `/var/lib/docker` is the VM's data root (that is where volume data actually lives).

## Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Compose

```bash
docker compose up --build
```

The app service is equivalent to:

```bash
docker run -it --privileged --pid=host harbour \
  nsenter -t 1 -m -u -n -i -- bun .output/server/index.mjs
```

`nsenter -n` uses the **host network**, so Compose `ports:` mappings do not apply. Harbour listens on the host at port 3000 (`PORT`). Open http://localhost:3000, or point a Cloudflare tunnel at `host:3000` rather than the compose service IP. `docker-compose.override.yml` still attaches the container to `cloudflared`; that network is not used by the nsenter'd process.
