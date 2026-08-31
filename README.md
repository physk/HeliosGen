# HeliosGen

HeliosGen is a small self-hosted image workspace for `codex-imagegen-cli`. It provides prompt-based generation, reference-image editing, a local gallery, and a Codex connection screen. It intentionally has no application accounts: put it behind your existing SSO or reverse proxy.

## Run locally

Requirements: Node 22+, pnpm, the official Codex CLI, Python/uv, and `codex-imagegen-cli`.

```sh
pnpm install
pnpm dev
```

Set `HELIOS_DATA_DIR=./data` and `CODEX_HOME=./data/codex` for local development. The app stores its JSON metadata in `data/db`, generated images in `data/images`, reference uploads in `data/references`, and Codex credentials in `data/codex`.

## Docker deployment

The production image packages Node, the official Codex CLI, Python/uv, and a pinned `codex-imagegen-cli` checkout:

```sh
docker compose up -d --build
```

The Compose file mounts the persistent `helios-data` volume at `/data`. This is the only application state volume required. Put an external SSO/reverse proxy in front of `http://localhost:3000` before exposing the service.

## Connect Codex

1. Open **Settings → Codex**.
2. Select **Connect Codex**.
3. Open the displayed verification URL and enter the device code.
4. Leave the page open while the official CLI completes authorization.

The official CLI owns the ChatGPT authentication and refresh flow. HeliosGen only starts it and reports its state; it never asks for an API key and never implements the private OAuth protocol itself. Credentials persist under `CODEX_HOME` (`/data/codex` in Docker).

## Image workflow

The main screen accepts a prompt, up to five image references, aspect ratio, and quality. `/api/generate` always invokes `codex-imagegen` and stores the resulting PNG locally. Generated images and uploads are served through a path-checked local media route, so a mounted `/data` volume survives container replacement.

The original workflow area is retained as a small image-only editor but is intentionally absent from primary navigation. Visit `/workflow` directly if you need to experiment with chained image operations.

## Development checks

```sh
pnpm typecheck
pnpm lint
pnpm build
```
