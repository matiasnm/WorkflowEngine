# Feature: Domain Events via Spring Events (ApplicationEventPublisher)

Publish `StateChanged` domain events through a proper hexagonal port, with the first adapter using Spring's `ApplicationEventPublisher` for in-process event distribution.

## Status

- **Iteration:** v0.4 (Hardening & Spring Events)
- **Backend:** ❌ Not implemented
- **Frontend:** N/A (backend-only)
- **Dependencies:** None

---

## 1. Motivation

The domain already defines a `StateChanged` event (created by `WorkflowEngine.transition()`), but this event is **only persisted** to the database and never published to any in-process or external listener.

Without event publishing:
- There is no way to react to state changes (e.g., send a notification, update a cache, trigger a side effect)
- The hexagonal port layer has no `EventPublisher` abstraction — events are an implementation detail of the persistence adapter
- Migrating to Kafka or another message broker in the future would require restructuring the application layer

This feature adds an `EventPublisher` port, publishes `StateChanged` events after each successful transition, and provides a Spring Events adapter as the first implementation.

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Application port** | `EventPublisher` interface with `publish(StateChanged)` method |
| **Application facade** | `WorkflowTransitionFacade` calls `EventPublisher` after a successful transition |
| **Infrastructure adapter** | `SpringEventPublisherAdapter` implementing `EventPublisher` via `ApplicationEventPublisher` |
| **Infrastructure adapter** | `LoggingEventPublisherAdapter` (optional) that logs events without publishing elsewhere — useful for tests and debugging |
| **Tests** | Unit test for the facade: verify `EventPublisher.publish()` is called with correct event |

### Out of Scope

- Kafka or any external message broker adapter — see [ADR-0001](../adr/ADR-0001-event-publishing-strategy.md)
- Event sourcing (storing events as the primary record) — events are recorded, but the current state is the source of truth
- Async processing (Spring `@Async` or `@EventListener` async) — can be added later without changing the port
- Frontend real-time updates (WebSocket) — can consume events in a future iteration

---

## 3. Architecture

```
Before (v0.3)
─────────────
UseCase → Facade → WorkflowEngine.transition()
                     → executionRepository.save()
                   // StateChanged is created but NOT published

After (v0.4)
────────────
UseCase → Facade → WorkflowEngine.transition()
                     → executionRepository.save()
                     → eventPublisher.publish(event)    ← NEW
                            │
                            ▼
                   SpringEventPublisherAdapter
                            │
                            ▼
                   ApplicationEventPublisher.publishEvent(event)
                            │
                            ▼
                   @EventListener components (in-process)
```

### Port Interface

```java
// application/port/EventPublisher.java
package com.newen.workflowEngine.application.port;

import com.newen.workflowEngine.domain.event.StateChanged;

public interface EventPublisher {
    void publish(StateChanged event);
}
```

### Spring Events Adapter

```java
// infrastructure/event/SpringEventPublisherAdapter.java
package com.newen.workflowEngine.infrastructure.event;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.EventPublisher;
import com.newen.workflowEngine.domain.event.StateChanged;

@Component
public class SpringEventPublisherAdapter implements EventPublisher {

    private final ApplicationEventPublisher publisher;

    public SpringEventPublisherAdapter(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void publish(StateChanged event) {
        publisher.publishEvent(event);
    }
}
```

### Logging Adapter (for tests / dev-memory profile)

```java
// infrastructure/event/LoggingEventPublisherAdapter.java
package com.newen.workflowEngine.infrastructure.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.EventPublisher;
import com.newen.workflowEngine.domain.event.StateChanged;

@Profile("memory")
@Component
public class LoggingEventPublisherAdapter implements EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingEventPublisherAdapter.class);

    @Override
    public void publish(StateChanged event) {
        log.info("Domain event: {}", event);
    }
}
```

### Facade Integration

In `WorkflowTransitionFacade.transition()`, add the publish call **after** `executionRepository.save()`:

```java
@Transactional
public ExecuteTransitionResult transition(WorkflowExecutionId executionId, String targetStateCode) {
    // ... existing validation and transition logic ...
    
    WorkflowEngine.TransitionResult result = engine.transition(pair.workflow(), pair.execution(), target);
    executionRepository.save(result.execution());
    eventPublisher.publish(result.event());   // ← NEW
    
    return new ExecuteTransitionResult(/* ... */);
}
```

---

## 4. Event Consumer Pattern (Future, Not in Scope)

Once the event is published via Spring Events, any `@EventListener` bean can react:

```java
@Component
public class StateChangeListener {

    @EventListener
    public void onStateChanged(StateChanged event) {
        // e.g., send notification, update cache, trigger side effect
    }
}
```

These listeners are NOT part of this feature — they belong to future iterations (notifications, WebSocket push, etc.). This feature only establishes the publishing mechanism.

---

## 5. Tests

| Test level | What to test |
|---|---|
| **Unit — Facade** | `WorkflowTransitionFacade.transition()` calls `eventPublisher.publish()` with the correct `StateChanged` event |
| **Unit — Facade** | Transactional rollback: if `eventPublisher.publish()` throws, the transaction rolls back (Spring Events is synchronous by default — the adapter runs inside the same transaction) |
| **Unit — SpringEventPublisherAdapter** | Adapter delegates to `ApplicationEventPublisher.publishEvent()` with the same event |
| **Unit — LoggingEventPublisherAdapter** | Adapter logs the event without throwing |

---

## 6. Implementation Order

1. Create `application/port/EventPublisher.java` (interface)
2. Create `infrastructure/event/SpringEventPublisherAdapter.java`
3. Create `infrastructure/event/LoggingEventPublisherAdapter.java`
4. Update `WorkflowTransitionFacade` to inject and call `EventPublisher`
5. Write unit tests for facade + adapters
6. Verify with `dev-jpa` profile that transitions still work and events are logged

---

## 7. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Publish before or after `save()`? | **After save** | If save fails, the event should not be published (consistency). Spring Events is synchronous by default, so it stays in the same transaction. |
| Separate port or reuse existing facade? | **New port** | Follows hexagonal architecture: `EventPublisher` is an output port, independent of the transition facade. |
| Why not Kafka directly? | **Spring Events first** | See [ADR-0001](../adr/ADR-0001-event-publishing-strategy.md). Spring Events is zero-infrastructure, establishes the port contract, and can be replaced by Kafka later. |

---

## 8. Changelog

| Date | Change |
|---|---|
| 2026-06-19 | Initial spec |
