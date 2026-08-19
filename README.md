# Harbour — Docker Volume Manager

Inspect Docker volumes, prune unused ones, and browse or edit files inside a bound volume.

## Setup

```bash
bun install
cp .env.example .env
```

## Environment

| Variable | Purpose |
| --- | --- |
| `VOLUME_BIND` | Named volume treated as bound for file browsing. Compose also creates/mounts this volume. |
| `VOLUME_PATH` | Directory where `VOLUME_BIND` is mounted in the app process (Compose: `/mnt/volume`). |
| `DOCKER_SOCKET` | Docker Engine socket (default `/var/run/docker.sock`). |
| `DOCKER_HOST` | Alternative daemon URL (`unix://` or `tcp://`). |
| `DVM_HELPER_IMAGE` | Image used to browse volumes that are not mounted at `VOLUME_PATH` (default `alpine:3.21`). |

If `VOLUME_PATH` is mounted, files in `VOLUME_BIND` are read from disk. Any other volume is opened by running a small helper container with that volume attached at `/data`.

The process that serves this app must be able to talk to the Docker socket (permissions on `/var/run/docker.sock`). First browse of an unmounted volume pulls `alpine:3.21` if it is not already present.

## Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Compose

```bash
docker compose up --build
```

Compose mounts the Docker socket and the volume named by `VOLUME_BIND` at `/mnt/volume`.
