# Feature: Transition Guards

Allow workflow transitions to carry pre-conditions that are evaluated against the execution's context at transition time. A transition is only allowed if the guard passes.

## Status

- **Iteration:** v2
- **Deferred because:** Requires execution context (`execution-context.md`) to be useful. Context must ship first so guards have data to evaluate.

---

## Motivation

Today the only rule for a transition is: *"does it exist in the workflow definition?"*. Guards add a second check: *"is a condition met right now?"*

Without guards, callers must implement their own validation logic before calling the transition API. With guards, the workflow engine enforces business rules centrally.

**Example:** An order approval flow with `context.amount`. The transition `PENDING → AUTO_APPROVED` should only be allowed if `amount < 1000`. The transition `PENDING → MANUAL_REVIEW` is always allowed.

---

## Key Design Questions

- **Where is the condition defined?** On the `Transition` in the workflow definition — e.g., `"guard": "context.amount < 1000"`.
- **What language/format for conditions?** Options: simple expression language (SpEL, MVEL, jexl), JSON-based rule DSL (`{ "field": "amount", "op": "lt", "value": 1000 }`), or scripted (Groovy, JS via GraalVM). JSON DSL is safest for v1 of guards — no arbitrary code execution.
- **Who evaluates the guard?** The `WorkflowEngine.transition()` domain service — same place that validates the transition graph.
- **What happens when a guard fails?** `422 Unprocessable Entity` with a clear message: `"Guard condition not met: context.amount must be < 1000"`.
- **Are guards visible in `next-states`?** Yes — `GET /executions/{id}/next-states` should only return states whose guard currently passes, so UIs can hide/disable unavailable transitions.

---

## Rough Implementation Sketch

1. Add optional `guard` field to `Transition` domain model and DB schema
2. Create a `GuardEvaluator` port + expression-based adapter
3. `WorkflowEngine.transition()` calls `guardEvaluator.evaluate(guard, execution.context)` before allowing the transition
4. `WorkflowEngine.nextStates()` filters out states whose guard fails

---

## Dependencies

- `execution-context.md` — must be implemented first
