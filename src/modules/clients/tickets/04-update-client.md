# Ticket 4: Update Client

**Epic:** [Client Management](../epic.md)
**Type:** Feature
**Depends on:** #1, #3 (reuses the scoped-lookup pattern)

---

## Description

Freelancer updates one or more fields on their own client.

## Files Touched

```
src/modules/clients/
  ├── clients.routes.ts         # add PATCH /:id
  ├── clients.controller.ts     # add update handler
  ├── clients.service.ts        # add update()
  ├── clients.repository.ts     # add update()
  └── clients.schema.ts         # add partial update schema
```

## Endpoint

```
PATCH /api/v1/clients/:id
```

**Request:** `Partial<{ firstName, lastName, email, companyName, notes }>`

**Responses:**

```
200 → updated Client
404 → { "error": "NOT_FOUND" }
409 → { "error": "ALREADY_EXISTS" }   // email change collides with another active client
```

## Implementation Notes

- **Update query must scope by `authUserId` in the same `WHERE`, same as ticket #3** — `db.update(clients).set(data).where(and(eq(clients.id, id), eq(clients.authUserId, authUserId)))`. Never fetch-then-check-then-update; the update statement itself must be incapable of touching another user's row.
- Zod schema for this endpoint uses `.partial()` on the create schema so every field is optional, but still validates whatever _is_ provided (e.g. a partial update with a malformed email still gets rejected).
- If `email` is included in the request and collides with the partial unique index (another active client, same user, same email), the repository throws the Postgres unique-violation, which the service maps to `ConflictError` → `409` — identical handling to the create ticket, so this logic can literally be extracted into a shared helper both `create()` and `update()` call.
- `updatedAt` should be set explicitly on every update (`sql\`now()\``or handled via a Drizzle`$onUpdate`hook) rather than relying on the DB default, since`defaultNow()` only fires on insert, not update.

## Acceptance Criteria

- [ ] Partial update (single field) succeeds and leaves other fields untouched
- [ ] Update targeting another user's client → `404`, no row modified
- [ ] Email change colliding with another active client (same user) → `409`
- [ ] Empty request body → either a no-op `200` or a `400`, pick one and document it (recommend: `400`, since a PATCH with nothing to change is a client bug worth surfacing, not silently accepting)
- [ ] `updatedAt` changes on every successful update

## Testing

- Unit: schema rejects malformed partial fields
- Integration: attempt update against another user's client ID, assert `404` and assert the row is genuinely unchanged in the DB (not just that the response was a 404)
