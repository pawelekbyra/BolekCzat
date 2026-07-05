# BolekCzat integration notes

BolekCzat is the LibreChat fork that will serve as the web chat UI for Agent Bolek. It should stay close to upstream LibreChat so future upstream updates remain easy to merge.

## Architecture

```txt
BolekCzat / LibreChat
  ↓
kulfon / Agent Bolek brain
  ↓
Bolek tools, memory, Telegram, Polutek ops
```

## Repository relationships

- `pawelekbyra/BolekCzat` is the LibreChat-based web UI.
- `pawelekbyra/kulfon` is the Agent Bolek brain and future OpenAI-compatible adapter host.
- `BolekDev` remains the broader development/operator context. BolekCzat should not absorb backend, tool, or operations logic from it.

LibreChat is only the UI layer. It should render chats, send messages to the adapter, and display responses. Agent behavior, memory, tool execution, Telegram integrations, Polutek operations, and action confirmation rules belong behind `kulfon`.

## Future Bolek endpoint

The future adapter endpoint is expected to expose OpenAI-compatible chat completions:

```txt
POST https://kulfon.pawel-perfect.workers.dev/v1/chat/completions
```

The base URL used by LibreChat is:

```txt
https://kulfon.pawel-perfect.workers.dev/v1
```

The initial model name is:

```txt
bolek
```

## Configuration files added in this fork

- `librechat.bolek.yaml` is an opt-in LibreChat configuration template for Agent Bolek.
- `.env.bolek.example` is an opt-in environment overlay for the Bolek endpoint.

This is intentionally not wired into production by default. If `CONFIG_PATH` is not changed, normal LibreChat defaults still apply.

## Required environment variables

```env
APP_TITLE=Agent Bolek
CONFIG_PATH=./librechat.bolek.yaml
BOLEK_API_BASE_URL=https://kulfon.pawel-perfect.workers.dev/v1
BOLEK_OPENAI_ADAPTER_KEY=replace-me
BOLEK_MODEL=bolek
```

`BOLEK_OPENAI_ADAPTER_KEY` must be replaced with the adapter key only in local or deployment environment storage. Do not commit the real value.

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

## Local Docker setup

1. Copy the standard LibreChat env file:

   ```bash
   cp .env.example .env
   ```

2. Copy the Agent Bolek values from `.env.bolek.example` into `.env`.
3. Replace `BOLEK_OPENAI_ADAPTER_KEY=replace-me` only when the `kulfon` adapter is deployed and ready.
4. Start local Docker:

   ```bash
   docker compose up -d
   ```

For the deployed compose stack, ensure `librechat.bolek.yaml` is copied or mounted as `librechat.yaml`, or set `CONFIG_PATH` to the mounted path.

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

Mount or copy `librechat.bolek.yaml` as the active LibreChat config. The adapter must be reachable from the LibreChat server container/process.

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

## Security boundaries

- BolekCzat must not receive direct Stripe, Clerk, Vercel, Resend, Polutek, GitHub, or other operational secrets.
- BolekCzat must not bypass Bolek's action confirmation gate.
- BolekCzat talks only to `kulfon`'s OpenAI-compatible adapter for Bolek behavior.
- Tool execution, memory writes, Telegram actions, Polutek operations, and sensitive integrations must remain behind `kulfon`.
- The only Bolek-specific secret expected in BolekCzat is the adapter key: `BOLEK_OPENAI_ADAPTER_KEY`.

## Current blocker

Chatting with Agent Bolek remains blocked until `kulfon` exposes the OpenAI-compatible `/v1/chat/completions` endpoint and accepts `BOLEK_OPENAI_ADAPTER_KEY`.
