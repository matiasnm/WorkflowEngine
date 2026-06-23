# Feature: Retry Policies

Define automatic retry behavior for failed transitions or webhook deliveries, with configurable backoff and maximum attempt counts.

## Status

- **Iteration:** v2
- **Deferred because:** There are no "failed" transitions today — a transition either succeeds or is rejected synchronously. Retries become relevant once async operations (webhook delivery, guard evaluation against external services) can fail transiently.

---

## Motivation

Two retry scenarios:

1. **Webhook retries:** A webhook POST to `callbackUrl` fails with a 5xx or timeout. Today the failure is logged and ignored. A retry policy would attempt redelivery with exponential backoff.

2. **Guard retries:** If a guard evaluates against an external service (e.g., a credit check API) and that service is temporarily unavailable, the transition could be retried rather than rejected.

---

## Key Design Questions

- **Scope:** Per-transition retry policy? Per-webhook? Global default with per-item overrides?
- **Storage:** Retry attempts must be tracked persistently so they survive restarts. A `webhook_delivery_attempt` table or an outbox pattern.
- **Backoff:** Exponential backoff with jitter is standard. Max attempts and max delay should be configurable.
- **Dead letter:** After max attempts, the event/delivery goes to a dead-letter queue or fires an alert.
- **Infrastructure:** Spring Retry (`spring-retry`) for in-process retries, or a proper job scheduler (Quartz, db-scheduler) for durable retries across restarts.

---

## Dependencies

- Webhook feature (`observability-and-webhooks.md`) — primary use case for retries
- `transition-guards.md` — second use case if guards call external services
