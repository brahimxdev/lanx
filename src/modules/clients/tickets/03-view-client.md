# Ticket 3: View Single Client

**Epic:** [Client Management](../epic.md)
**Type:** Feature
**Depends on:** #1

---

## Description

Freelancer fetches one client by ID. This is the ticket where the cross-tenant scoping pattern (404-not-403) first gets implemented — every later ticket that fetches a single record by ID (#4, #5, and every module after this epic) copies this exact pattern.

## Files Touched

```
src/modules/clients/
  ├── clients.routes.ts         # add GET /:id
  ├── clients.controller.ts     # add getById handler
  ├── clients.service.ts        # add getById()
  └── clients.repository.ts     # add findById()
```

## Endpoint

```
GET /api/v1/clients/:id
```

**Responses:**

```
200 → Client
404 → { "error": "NOT_FOUND" }   // client doesn't exist OR belongs to another user — identical response either way
```

## Implementation Notes

**This is the one query pattern in the whole epic worth getting exactly right, because it's the template every future single-record fetch copies.**

```typescript
// clients.repository.ts
async function findById(id: string, authUserId: string) {
  return db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.authUserId, authUserId)),
  });
}
```

Do **not** write this as "fetch by ID, then check `client.authUserId === req.user.id` in the service." That version works today, but it's a fetch-then-check pattern — one refactor away from someone deleting the check and silently reintroducing a cross-tenant leak, because nothing about the code signals the check was ever load-bearing. Folding the ownership condition into the `WHERE` clause itself means there is no "leaked" state to accidentally return in the first place — a non-owned record simply never comes back from the query, full stop.

The controller/service layer never distinguishes "doesn't exist" from "exists but isn't yours" — both produce `null` from the repository, both become a `404`. This is intentional (see TRD §4): a `403` would confirm record existence to a caller who shouldn't get any signal at all.

## Acceptance Criteria

- [ ] Own client, valid ID → `200` with full record
- [ ] Non-existent ID → `404`
- [ ] Valid ID belonging to a _different_ user → `404` (not `403`, not `200`)
- [ ] Archived client is still fetchable by direct ID (archiving hides from the _list_, not from direct lookup — needed since other modules will reference archived clients, e.g. viewing an old invoice's client)

## Testing

- Integration: seed a client under user A, assert user B's request for that ID returns `404`
- Integration: assert response body is identical between "not found" and "not yours" cases (no field leaks either way)
