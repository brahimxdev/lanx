# Ticket 1: Create Client

**Epic:** [Client Management](../epic.md)
**Type:** Feature
**Depends on:** Auth module (JWT middleware must exist and populate `req.user`)

---

## Description

Freelancer creates a new client record, scoped to their own account. This ticket also establishes the module skeleton (`src/modules/clients/`) and the `clients` DB table + migration — both of which every later ticket in this epic builds on top of, so it should land first.

## Files Touched

```
src/db/schema/clients.ts        # new — table definition
src/db/schema/index.ts          # updated — export clients table, define relation to authUsers
src/db/migrations/              # new migration generated via drizzle-kit
src/modules/clients/
  ├── clients.routes.ts         # new
  ├── clients.controller.ts     # new
  ├── clients.service.ts        # new
  ├── clients.repository.ts     # new
  ├── clients.schema.ts         # new — zod request schema
  └── clients.types.ts          # new
src/app.ts                      # updated — mount clients router
```

## DB Schema

```typescript
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    companyName: text("company_name"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_clients_auth_user_id_email")
      .on(table.authUserId, table.email)
      .where(sql`${table.archivedAt} IS NULL`),
    index("idx_clients_auth_user_id").on(table.authUserId),
  ]
);
```

Note the unique index is partial (`WHERE archived_at IS NULL`) — this is what lets a freelancer re-add a client with the same email after archiving the original, without the unique constraint blocking it. Without the partial clause, an archived client would permanently "reserve" that email even though it's no longer active.

## Endpoint

```
POST /api/v1/clients
```

**Request:**

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "companyName": "string?",
  "notes": "string?"
}
```

**Responses:**

```
201 → { id, authUserId, firstName, lastName, email, companyName, notes, archivedAt: null, createdAt, updatedAt }
400 → { error: "VALIDATION_ERROR", fields: { email: "invalid format" } }
409 → { error: "ALREADY_EXISTS", message: "A client with this email already exists" }
```

## Implementation Notes

- **Validation** happens in `clients.schema.ts` via a Zod schema, applied through the shared `validate.middleware.ts` _before_ the controller runs — the controller should never see a malformed body.
- **Service layer** (`clients.service.ts`) catches the Postgres unique-violation error from the repository and re-throws it as a typed `ConflictError` — the controller only ever deals with typed application errors, never raw DB error objects.
- **Repository method signature:** `create(data: NewClient, authUserId: string)` — `authUserId` is a required parameter, not pulled from `data`, so it's impossible to call this without explicitly supplying the tenant scope.

## Acceptance Criteria

- [ ] Valid request creates a client and returns `201` with the full record
- [ ] Missing/malformed `email` returns `400` with field-level detail, never reaches the DB
- [ ] Duplicate `(authUserId, email)` among _active_ (non-archived) clients returns `409`
- [ ] Re-adding a previously _archived_ client's email succeeds (partial index behavior)
- [ ] Created client's `authUserId` always equals `req.user.id` — never client-suppliable in the request body
- [ ] Migration runs cleanly against a fresh DB

## Testing

- Unit: service throws `ConflictError` on repository duplicate-key error
- Integration: repository `create()` against real Postgres — verify partial unique index behavior specifically (this is the one behavior a unit test with a mocked repository cannot catch)
