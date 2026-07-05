# CODEX-PROMPT — Start Here

> Copy the text below and send it to Codex to start implementing the wrapper.

---

## Prompt for Codex

```
You are working in repository /home/user/BolekCzat on branch claude/multi-repo-agent-j3bo9v.

Read the file WRAPPER-SETUP.md in this repo.

Implement BolekCzat wrapper according to those instructions, in order.

BolekCzat is a thin TypeScript wrapper around LibreChat (forked, unmodified).

Tasks 1-10:

1. Initialize wrapper package.json with Hono dependencies
2. Create TypeScript config (tsconfig.json)
3. Define wrapper types (src/types.ts) for Bolek/LibreChat formats
4. Implement logger (src/logger.ts)
5. Implement LibreChat adapter (src/adapter.ts) for message translation
6. Create Hono server (src/index.ts) with /api/agent/* endpoints
7. Add Docker compose (docker-compose.yml) for wrapper + LibreChat
8. Create environment config (.env.example, .env)
9. Write unit tests (src/__tests__/adapter.test.ts)
10. Create README (WRAPPER-README.md)

Each task in WRAPPER-SETUP.md includes:
- Exact file path
- Complete code snippets
- What to commit

After each task:
1. Commit with provided message: git commit -m "..."
2. Continue to next task
3. After all tasks: git push -u origin claude/multi-repo-agent-j3bo9v

If stuck:
- Read WRAPPER-STRUCTURE.md for architecture
- Check if you're in correct directory
- Verify file paths

Start with Task 1 (package.json).
```

---

## How to Use

1. Copy the prompt above
2. Send to Codex
3. Codex will follow WRAPPER-SETUP.md step-by-step
4. Should complete in 3-5 turns

---

## What Gets Built

Wrapper (~500 lines of TypeScript):
- `package.json` — Hono + dependencies
- `tsconfig.json` — TypeScript config
- `src/types.ts` — Type definitions
- `src/logger.ts` — Structured logging
- `src/adapter.ts` — LibreChat API translation
- `src/index.ts` — Hono server (3 endpoints)
- `docker-compose.yml` — Run wrapper + LibreChat
- `src/__tests__/adapter.test.ts` — Unit tests
- `.env` configuration

Result: Bolek-compatible chat API at http://localhost:3000

---

## Expected Endpoints

After Codex finishes:
- `POST /api/agent/message` — Send message, get response
- `GET /api/agent/conversations` — List conversations
- `GET /api/agent/conversations/:id` — Get conversation with history

All with Bearer token auth.

---

## Timeline

Should take 3-5 turns total.
