# Epic: Client Management

**Project:** Lanx
**TRD:** Client Management TRD (see attached/prior doc)
**Architecture:** See [`architecture.md`](/docs/architecture.md) — folder structure, layering, and error-handling conventions referenced by every ticket below.
**Status:** Not started

---

## Why this epic exists

Client Management is the dependency root of the whole product. Proposals, Contracts, Projects, and Invoices all hold a foreign key back to a client — none of those epics can start until this one ships. It's small in scope, but it's not optional groundwork; it's the first thing built, and the ownership-scoping pattern it establishes gets reused, unchanged, in every epic after it.

## Definition of Done

This epic is done when a freelancer can create, view, list, search, update, and archive their own clients through the authenticated dashboard API — with every operation strictly scoped so one freelancer can never read or modify another freelancer's client records.

## Module Location

`src/modules/clients/` — per the project architecture doc. This is the first module in the codebase; its structure becomes the template every later module (`proposals/`, `contracts/`, etc.) copies.

## Tickets

| #   | Ticket                                                                              | Depends on             |
| --- | ----------------------------------------------------------------------------------- | ---------------------- |
| 1   | [Create client](tickets/01-create-client.md)                                        | Auth module, DB schema |
| 2   | [List clients (paginated + searchable)](tickets/02-list-clients.md)                 | #1                     |
| 3   | [View single client](tickets/03-view-client.md)                                     | #1                     |
| 4   | [Update client](tickets/04-update-client.md)                                        | #1                     |
| 5   | [Archive client](tickets/05-archive-client.md)                                      | #1                     |
| 6   | [Cross-tenant scoping enforcement + test suite](tickets/06-cross-tenant-scoping.md) | #1–#5                  |

Suggested build order: #1 first (establishes schema + module skeleton every other ticket builds on), then #2–#5 in any order since they're independent endpoints, then #6 last as a hardening pass across everything already built — though its _rules_ (see its ticket) should be followed from #1 onward, not bolted on retroactively.
