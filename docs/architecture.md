# Lanx — Backend Architecture

This document is project-wide, not specific to any one epic. Every epic's tickets reference this rather than re-explaining folder structure and layering each time.

---

## Folder Structure — Feature-Based (Vertical Slice)

**Recommendation: group by feature, not by technical layer.**

The alternative — a `controllers/`, `services/`, `repositories/` folder at the top level, each containing files for every feature — looks organized early on but breaks down as you add features. With 10 features, a single change to "how invoices work" touches four different top-level folders instead of one. Code review, git blame, and just finding-where-things-are all get harder as the app grows, precisely because the folder structure doesn't match the mental model you already have from your TRDs and epics. Feature-based structure keeps the module boundary in code identical to the module boundary in your planning docs — open the `clients/` folder, and everything about clients is right there.

```
lanx/
├── src/
│   ├── modules/
│   │   ├── clients/
│   │   │   ├── clients.routes.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── clients.repository.ts
│   │   │   ├── clients.schema.ts        # zod request validation + inferred types
│   │   │   ├── clients.types.ts
│   │   │   └── clients.test.ts
│   │   │   └── clients.module.ts
│   │   ├── proposals/
│   │   ├── contracts/
│   │   ├── projects/
│   │   ├── invoices/
│   │   └── auth/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── clients.ts               # drizzle table definitions
│   │   │   ├── auth-users.ts
│   │   │   └── index.ts                 # barrel export + relations
│   │   ├── migrations/
│   │   └── client.ts                    # drizzle db instance, pool config
│   ├── middleware/
│   │   ├── auth.middleware.ts           # verifies JWT, attaches req.user
│   │   ├── error.middleware.ts          # centralized error handler
│   │   └── validate.middleware.ts       # generic zod-schema validation wrapper
│   ├── errors/
│   │   ├── AppError.ts              # base class
│
│   ├── config/
│   │   ├── env.ts                       # validated env vars (fail fast on boot)
│   │   └── redis.ts
│   ├── app.ts                           # express app assembly, mounts modules
│   └── server.ts                        # entrypoint, listens
├── docker-compose.yml
├── Dockerfile
└── drizzle.config.ts
```

---

## Layering Within a Module

Every module follows the same chain: **routes → controller → service → repository**. Each layer has exactly one job, which is the whole point — it's what makes the codebase testable and lets you reason about a bug by knowing which layer it must live in.

| Layer             | Responsibility                                                              | Must NOT do                                                      |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `*.routes.ts`     | Wire HTTP method + path to middleware + controller                          | Any logic                                                        |
| `*.controller.ts` | Parse `req`, call service, shape the HTTP response                          | Business logic, DB queries                                       |
| `*.service.ts`    | Business rules, ownership logic, orchestration                              | Raw SQL/Drizzle calls, HTTP concerns (status codes, `req`/`res`) |
| `*.repository.ts` | The _only_ layer that touches Drizzle/the DB directly                       | Business rules                                                   |
| `*.validation.ts` | Zod schema for request validation; `z.infer` gives you the TS type for free | —                                                                |

**Why the repository layer is non-negotiable, specifically:** it's the layer where your multi-tenant scoping rule (§4/§5 of the Client Management TRD) actually lives. Every repository method that touches a tenant-owned table takes `authUserId` as a required parameter, not optional — e.g. `findById(id: string, authUserId: string)`, never `findById(id: string)`. Making it required at the function signature, not just a convention you remember to follow, means a call site that forgets to pass it is a **TypeScript compile error**, not a runtime security bug someone finds in prod. This is the same principle from the TRD — bake the constraint into the structure so it can't be silently skipped — just applied one level down, at the type system instead of the query.

---

## Error Handling Convention

Services throw typed errors; a single Express error-handling middleware catches them and maps to HTTP responses. Controllers never manually set error status codes — that logic lives in exactly one place.

```typescript
// common/errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

// clients.service.ts
async function getClientById(id: string, authUserId: string) {
  const client = await clientsRepository.findById(id, authUserId);
  if (!client) throw new AppError.NotFound();
  return client;
}

// middleware/error.middleware.ts
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }
  console.error(err); // unexpected error — log full detail, don't leak it
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Something went wrong" });
});
```

## Testing Structure

Tests live next to the module they test (`clients.test.ts` inside `clients/`), not in a parallel `tests/` tree — same reasoning as the folder structure itself: what changes together should live together.

- **Service tests** — unit tests, repository mocked. Fast, cover business logic (ownership rules, validation edge cases).
- **Repository tests** — integration tests against a real Postgres instance (docker-compose test DB), since this is the layer where a wrong Drizzle query is an actual bug, not something a mock would catch.

This split matters for the "cross-tenant scoping" concern specifically: a mocked-repository unit test can't verify the _actual SQL_ scopes correctly — you need at least one integration test per tenant-owned table that asserts "user A cannot fetch user B's row," run against a real database.
