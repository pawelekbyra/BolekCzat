# BolekCzat integration notes

BolekCzat is the LibreChat fork that will serve as the web chat UI for Agent Bolek. It should stay close to upstream LibreChat so future upstream updates remain easy to merge.

---

## Architecture

```txt
BolekCzat / LibreChat
  ↓
BolekAI / Agent Bolek brain
  ↓
Bolek tools, memory, Telegram, Polutek ops
```

`BolekAI` is the repository/backend identity. The current deployed Cloudflare Worker URL may still use the legacy `kulfon.pawel-perfect.workers.dev` hostname until the deployment is renamed.

---

## Repository relationships

- `pawelekbyra/BolekCzat` is the LibreChat-based web UI.
- `pawelekbyra/BolekAI` is the Agent Bolek brain/backend and OpenAI-compatible adapter host.
- `pawelekbyra/BolekDev` is the future coding executor.
- `pawelekbyra/BolekKB` is the future knowledge base / RAG layer.
- `pawelekbyra/BolekFlow` is the future workflow automation layer.

LibreChat is only the UI layer. It should render chats, send messages to the adapter, and display responses. Agent behavior, memory, tool execution, Telegram integrations, Polutek operations, and action confirmation rules belong behind `BolekAI`.

---

## Bolek endpoint

The BolekAI adapter exposes an OpenAI-compatible chat completions endpoint:

```txt
POST https://kulfon.pawel-perfect.workers.dev/v1/chat/completions
```

The base URL used by LibreChat is currently:

```txt
https://kulfon.pawel-perfect.workers.dev/v1
```

If the Cloudflare Worker route is renamed later, update only `BOLEK_API_BASE_URL`; the LibreChat configuration shape should stay the same.

The initial model name is:

```txt
bolek
```

---

## Configuration files added in this fork

- `librechat.bolek.yaml` is an opt-in LibreChat configuration template for Agent Bolek.
- `.env.bolek.example` is an opt-in environment overlay for the Bolek endpoint.

This is intentionally not wired into production by default. If `CONFIG_PATH` is not changed, normal LibreChat defaults still apply.

---

## Required environment variables

```env
APP_TITLE=Agent Bolek
CONFIG_PATH=./librechat.bolek.yaml
BOLEK_API_BASE_URL=https://kulfon.pawel-perfect.workers.dev/v1
BOLEK_OPENAI_ADAPTER_KEY=replace-me
BOLEK_MODEL=bolek
```

`BOLEK_OPENAI_ADAPTER_KEY` must be replaced with the adapter key only in local or deployment environment storage. Do not commit the real value.

---

## Endpoint shape

`librechat.bolek.yaml` defines a custom OpenAI-compatible endpoint named `Agent Bolek`:

```yaml
endpoints:
  custom:
    - name: 'Agent Bolek'
      apiKey: '${BOLEK_OPENAI_ADAPTER_KEY}'
      baseURL: '${BOLEK_API_BASE_URL}'
      models:
        default:
          - '${BOLEK_MODEL}'
        fetch: false
      titleConvo: true
      titleModel: '${BOLEK_MODEL}'
      modelDisplayLabel: 'Agent Bolek'
```

The template also defines a default model spec pointing at endpoint `Agent Bolek` and model `${BOLEK_MODEL}`.

`fetch: false` is intentional. BolekCzat does not require BolekAI to expose `/v1/models` for the first integration milestone.

---

## Local Docker setup

1. Copy the standard LibreChat env file:

   ```bash
   cp .env.example .env
   ```

2. Copy the Agent Bolek values from `.env.bolek.example` into `.env`.
3. Replace `BOLEK_OPENAI_ADAPTER_KEY=replace-me` only when the `BolekAI` adapter is deployed and ready.
4. Start local Docker:

   ```bash
   docker compose up -d
   ```

For the deployed compose stack, ensure `librechat.bolek.yaml` is copied or mounted as `librechat.yaml`, or set `CONFIG_PATH` to the mounted path.

---

## Production setup

Production should inject environment variables through the deployment platform's secret manager. Do not commit production secrets to this repository.

Minimum production values:

```env
APP_TITLE=Agent Bolek
CONFIG_PATH=/app/librechat.yaml
BOLEK_API_BASE_URL=https://kulfon.pawel-perfect.workers.dev/v1
BOLEK_OPENAI_ADAPTER_KEY=<secret-from-platform>
BOLEK_MODEL=bolek
```

Mount or copy `librechat.bolek.yaml` as the active LibreChat config. The BolekAI adapter must be reachable from the LibreChat server container/process.

---

## Deployment options

### Local Docker

Use the existing `docker-compose.yml`. It bind-mounts `.env` into the API container and runs MongoDB, Meilisearch, pgvector, and the RAG API services. Add the Bolek variables to `.env` and set `CONFIG_PATH=./librechat.bolek.yaml` for local source-based runs.

### Railway

Deploy the LibreChat API/container with MongoDB and required persistent storage according to LibreChat's normal Railway pattern. Add the Bolek variables in Railway Variables/Secrets. Mount or package the Bolek LibreChat config and point `CONFIG_PATH` at it.

### Fly.io

Deploy as a Docker app with persistent volumes for uploads/logs as needed and an external or managed MongoDB. Add Bolek variables as Fly secrets (`fly secrets set ...`). Include the Bolek YAML in the image or mount it and set `CONFIG_PATH`.

### Render

Use a Docker Web Service or equivalent container deployment. Configure MongoDB/persistent services separately. Add Bolek variables in Render Environment. Ensure the YAML config is present in the running container and `CONFIG_PATH` points to it.

### VPS/Docker

Use `deploy-compose.yml` or a lightly customized compose file on the VPS. Store real secrets in `.env` on the server only. For the deployed compose template, either copy `librechat.bolek.yaml` to `librechat.yaml` before startup or adjust the bind mount/config path.

---

## Security boundaries

- BolekCzat must not receive direct Stripe, Clerk, Vercel, Resend, Polutek, GitHub, or other operational secrets.
- BolekCzat must not bypass Bolek's action confirmation gate.
- BolekCzat talks only to `BolekAI`'s OpenAI-compatible adapter for Bolek behavior.
- Tool execution, memory writes, Telegram actions, Polutek operations, and sensitive integrations must remain behind `BolekAI`.
- The only Bolek-specific secret expected in BolekCzat is the adapter key: `BOLEK_OPENAI_ADAPTER_KEY`.

---

## Current status

BolekCzat is configured as an opt-in LibreChat UI for Agent Bolek. Chatting through this UI requires a deployed BolekAI `/v1/chat/completions` adapter and a valid `BOLEK_OPENAI_ADAPTER_KEY`.

---

## Network map

```txt
BolekCzat  → web UI / LibreChat
BolekAI    → brain/backend/tools/memory/approval gate
BolekDev   → future coding executor
BolekKB    → future knowledge base / RAG
BolekFlow  → future workflow automation
```
