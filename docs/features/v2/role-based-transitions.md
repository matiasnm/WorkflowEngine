# Feature: Role-Based Transitions

Restrict which transitions a caller can execute based on their role or identity. A transition can only be triggered by callers who hold the required role.

## Status

- **Iteration:** v2
- **Deferred because:** Requires a richer auth model than the v1 API key (which has no concept of roles or identities). Depends on transitioning from static API keys to per-caller credentials.

---

## Motivation

In a multi-participant workflow (e.g., an invoice approval where a manager must approve and a finance officer must pay), different transitions should only be executable by specific roles. Without this, any caller with an API key can trigger any transition.

**Example:** Workflow states: `SUBMITTED → APPROVED → PAID`. The `APPROVED` transition should only be executable by role `MANAGER`. The `PAID` transition only by role `FINANCE`.

---

## Key Design Questions

- **Where is the role defined?** On the `Transition` in the workflow definition — e.g., `"requiredRole": "MANAGER"`.
- **How does the engine know the caller's role?** The API key must carry identity/role information. Options: a `caller-roles` claim in a JWT, a per-key role mapping in the DB, or a separate identity header.
- **Interaction with guards:** Role checks and guards are both pre-conditions on a transition. They could be unified under the same guard mechanism (a guard that checks `caller.role == "MANAGER"`), or kept as a separate first-class concept for clarity.
- **`next-states` filtering:** `GET /executions/{id}/next-states` should only return states the current caller is allowed to transition to.

---

## Dependencies

- `transition-guards.md` — may be implemented as a special class of guard
- Requires enhanced auth (JWT or per-key role mapping) beyond v1 static API keys
