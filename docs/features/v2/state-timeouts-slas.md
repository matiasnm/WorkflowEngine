# Feature: State Timeouts / SLAs

Allow workflow states to carry a maximum duration. When an execution stays in a state longer than its configured timeout, a configured action is triggered automatically.

## Status

- **Iteration:** v2
- **Deferred because:** Requires a background scheduler, execution context, and ideally transition guards to be meaningful. The feature is well-understood but has non-trivial infrastructure requirements.

---

## Motivation

Today transitions only happen when someone explicitly calls the API. There is no way to express time-based rules like:
- "If an order stays in PENDING for more than 48 hours, escalate it."
- "If no one acts within 24 hours, auto-reject."
- "Alert the team if REVIEW takes longer than 4 hours."

These are standard SLA requirements in any approval or operations workflow.

---

## Key Design Questions

- **Where is the timeout defined?** On the `State` in the workflow definition — e.g., `"timeout": { "duration": "PT48H", "action": "ESCALATED" }` where `action` is the target state to transition to, or `"action": "ALERT"` for a notification without a state change.
- **What triggers evaluation?** A Spring `@Scheduled` background job that periodically queries for executions that have been in a non-terminal state longer than the state's configured timeout.
- **How do we know when an execution entered its current state?** The `state_changed` history records every transition timestamp. The most recent entry's timestamp is when the execution entered its current state. We may also want to cache `current_state_since` on `workflow_execution` for efficient querying.
- **What happens on timeout?** Two options: auto-transition to a configured target state, or fire an event/webhook and let the caller decide. A combination is ideal.
- **Scheduler cadence:** Every minute is fine for hour-scale SLAs. Sub-minute precision is out of scope.

---

## Rough Implementation Sketch

1. Add optional `timeout` field to `State` domain model and DB schema (`duration ISO-8601`, `onTimeout` target state code or action type)
2. Add `current_state_since` timestamp column to `workflow_execution` for efficient timeout queries
3. `StateTimeoutScheduler` — `@Scheduled` job that queries executions where `current_state_since < now - timeout_duration` and calls `WorkflowTransitionFacade.transition()` with the configured target state
4. Fire a `StateTimedOut` domain event that webhooks and logging can consume

---

## Dependencies

- `execution-context.md` — useful but not strictly required
- `transition-guards.md` — may interact (a guard on the auto-transition target state)
- Webhook feature — natural consumer of timeout events
