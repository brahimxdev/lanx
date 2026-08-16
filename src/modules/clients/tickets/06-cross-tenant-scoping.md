# Ticket 6: Cross-Tenant Scoping Enforcement + Test Suite

**Epic:** [Client Management](../epic.md)
**Type:** Hardening / Cross-cutting
**Depends on:** #1–#5 (audits work already built)

---

## Description

This ticket isn't a new user-facing feature — it's the one item in the epic that exists purely to protect a security invariant that spans every other ticket: **a freelancer can never read, list, modify, or archive another freelancer's client data, under any request shape.**

The reasoning for tracking this as its own ticket rather than trusting it to be "covered" incidentally by #1–#5: each of those tickets tests its _own_ endpoint's scoping in isolation, but nothing forces a check that the rule was applied _consistently_ across all five, or catches a regression later when a sixth endpoint gets added to this module without anyone remembering the pattern. This ticket is that explicit checkpoint.

## Scope

1. **Audit** — read through every repository method built in #1–#5, confirm every single one that touches the `clients` table takes `authUserId` as a required (non-optional) parameter and uses it inside the `WHERE` clause, not as an application-level post-fetch check.
2. **Lint-level guard (optional but recommended)** — since this pattern will repeat in every future module, consider a lightweight repository-layer convention check: a code review checklist item, or a custom ESLint rule if you want to enforce it mechanically, that flags any `db.query.<tenantTable>` call inside a repository file that doesn't include the tenant-scoping column in its `where`.
3. **Dedicated tenant-isolation test suite** — one integration test file (`clients.tenant-isolation.test.ts`) that seeds two users (A and B), gives each a client, and asserts — for _every_ endpoint in this module — that A can never see, modify, or archive B's client, and vice versa.

## Files Touched

```
src/modules/clients/
  └── clients.tenant-isolation.test.ts   # new — dedicated cross-cutting test file
docs/                                    # optional — short internal note documenting the pattern,
                                          # so it's written down once rather than re-derived per module
```

## Test Suite Contents

For each of the five endpoints, assert the cross-tenant case explicitly:

| Endpoint              | Cross-tenant assertion                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /clients`        | User B's client never appears in User A's list, under any `search`/`includeArchived` combination                                                                                                                                 |
| `GET /clients/:id`    | User A requesting User B's client ID → `404`, response body identical to a genuinely non-existent ID                                                                                                                             |
| `PATCH /clients/:id`  | User A's update request against User B's client ID → `404`, and the DB row is asserted unchanged afterward (not just that the HTTP response was a 404)                                                                           |
| `DELETE /clients/:id` | User A archiving User B's client → `404`, and `archivedAt` on B's row is asserted still `null` afterward                                                                                                                         |
| `POST /clients`       | Not directly applicable (creation has no target ID) — instead assert the _created_ record's `authUserId` always equals the authenticated user, never a client-suppliable value, even if the request body attempts to include one |

## Why This Matters Enough to Be Its Own Ticket

This is the one category of bug in this entire epic that, if it slips through, isn't a UX annoyance — it's a data breach between two paying customers on a multi-tenant SaaS. Everything else in this epic (validation errors, pagination edge cases) degrades gracefully if imperfect. This doesn't. That asymmetry is the justification for giving it dedicated tracking instead of assuming it's "obviously" covered by the individual endpoint tickets.

## Acceptance Criteria

- [ ] Every repository method in `clients.repository.ts` requires `authUserId` as a parameter — verified by code read, not assumption
- [ ] Dedicated tenant-isolation test file exists and covers all five endpoints per the table above
- [ ] All tenant-isolation tests pass against a real Postgres instance (not mocked)
- [ ] Pattern is documented somewhere durable (this ticket, or a short architecture note) so it's copied deliberately into the next module, not reinvented or forgotten
