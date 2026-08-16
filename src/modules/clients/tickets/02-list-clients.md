# Ticket 2: List Clients (Paginated + Searchable)

**Epic:** [Client Management](../epic.md)
**Type:** Feature
**Depends on:** #1 (schema + module skeleton)

---

## Description

Freelancer views their own client list, paginated, with optional search and archived-inclusion toggle.

## Files Touched

```
src/modules/clients/
  ├── clients.routes.ts         # add GET /
  ├── clients.controller.ts     # add list handler
  ├── clients.service.ts        # add list() with search/pagination logic
  ├── clients.repository.ts     # add findMany() with filters
  └── clients.schema.ts         # add query-param validation schema
src/common/pagination/          # new — shared pagination helper, reused by every future list endpoint
```

## Endpoint

```
GET /api/v1/clients?page=&limit=&sortBy=createdAt&sortOrder=desc&search=&includeArchived=false
```

**Response:**

```json
200 → { "data": [Client], "page": 1, "limit": 20, "total": 47 }
```

`search` matches `firstName`, `lastName`, and `email` — case-insensitive, partial match. Archived clients excluded by default; `includeArchived=true` includes them.

## Implementation Notes

- **Pagination defaults live in the shared helper**, not duplicated per module — since every future list endpoint (proposals, invoices, etc.) needs the same `page`/`limit`/`total` shape. Build it once here as `src/common/pagination/`, reference it from every module going forward rather than reinventing pagination logic per feature.
- **Search implementation:** Postgres `ILIKE` with wrapped wildcards (`%term%`) on `first_name`, `last_name`, `email` — combined with `OR`. At Lanx's realistic scale (a freelancer's client list, not a call-center database) this is sufficient; full-text search would be solving a problem you don't have.
- **Repository method signature:** `findMany(authUserId: string, filters: { search?, includeArchived?, page, limit, sortBy, sortOrder })` — again, `authUserId` required and first, not folded into an options object where it could be omitted.
- Cap `limit` server-side (e.g. max 100) regardless of what's requested — an unbounded `limit` query param is a trivial way to turn a cheap paginated endpoint into an expensive full-table scan.

## Acceptance Criteria

- [ ] Returns only the requesting user's clients — never another user's, regardless of query params
- [ ] Default response excludes archived clients
- [ ] `includeArchived=true` includes them
- [ ] `search` matches partial, case-insensitive on name and email
- [ ] `limit` is capped server-side even if a larger value is requested
- [ ] Empty result set returns `200` with `data: []`, not a `404`
- [ ] Response includes accurate `total` (count of matching rows, not just the page size)

## Testing

- Unit: search-term filtering logic, pagination math (page/limit → offset)
- Integration: seed multiple clients across two different `authUserId`s, verify list only returns the requester's own
