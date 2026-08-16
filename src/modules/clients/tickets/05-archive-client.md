# Ticket 5: Archive Client

**Epic:** [Client Management](../epic.md)
**Type:** Feature
**Depends on:** #1, #3

---

## Description

Freelancer "deletes" a client — implemented as a soft delete (`archivedAt` set), never a hard `DELETE` row, per the TRD's reasoning: future epics (Proposals, Contracts, Invoices) will hold FKs to this table, and a hard delete either cascades and destroys financial/legal history, or gets blocked by the FK constraint with a confusing error. Soft delete avoids both.

## Files Touched

```
src/modules/clients/
  ├── clients.routes.ts         # add DELETE /:id
  ├── clients.controller.ts     # add archive handler
  ├── clients.service.ts        # add archive()
  └── clients.repository.ts     # add archive()
```

## Endpoint

```
DELETE /api/v1/clients/:id
```

**Responses:**

```
204 → (no content) — sets archivedAt = now()
404 → { "error": "NOT_FOUND" }
```

## Implementation Notes

```typescript
// clients.repository.ts
async function archive(id: string, authUserId: string) {
  const [result] = await db
    .update(clients)
    .set({ archivedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.authUserId, authUserId), isNull(clients.archivedAt)))
    .returning({ id: clients.id });
  return result;
}
```

Note the extra `isNull(clients.archivedAt)` condition — archiving an already-archived client should be a no-op that still returns `404` (nothing matched the `WHERE`, service returns not-found), rather than silently re-setting `archivedAt` to a new timestamp. Otherwise you'd lose the original archive date on a repeated call, which matters if you ever want to show "archived on [date]" in the UI.

- Route method is `DELETE` at the HTTP level (matches REST convention and what a frontend expects), but nothing in the implementation issues a SQL `DELETE` — worth a one-line comment in the controller so this isn't confusing to a future reader (including future-you).
- This endpoint does **not** need to check for related proposals/contracts/projects before archiving — archiving is non-destructive, so there's nothing to protect against here. The actual guard belongs in the _Proposals_ epic later: the client-picker for "create new proposal" should filter out archived clients. Flagging this now so it isn't forgotten when that epic starts.

## Acceptance Criteria

- [ ] Archiving own client → `204`, `archivedAt` set to current timestamp
- [ ] Archiving another user's client → `404`, no row modified
- [ ] Archiving an already-archived client → `404` (not a silent re-archive)
- [ ] Archived client no longer appears in default `GET /clients` list (covered by #2, but re-verify here as an integration check across both endpoints)
- [ ] Archived client is still directly fetchable via `GET /clients/:id` (per #3)

## Testing

- Integration: archive, then assert list endpoint excludes it and direct-fetch endpoint still returns it
- Integration: archive twice, assert second call is `404` and `archivedAt` timestamp from the first call is unchanged
