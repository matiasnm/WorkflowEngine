# ADR-0001: Event Publishing Strategy — Spring Events First, Kafka Later

## Status

Accepted

## Context

The workflow engine's domain model produces `StateChanged` events whenever a workflow execution transitions from one state to another. Currently, these events are:

1. Created by `WorkflowEngine.transition()` (pure domain service)
2. Persisted to the `state_changed` table via the JPA adapter
3. **Never published** to any in-process or external listener

We need a mechanism to distribute these events so that other parts of the system (or external systems) can react to state changes — for example, sending notifications, updating caches, pushing real-time updates to the frontend, or triggering side effects.

Two main options were considered: Spring's `ApplicationEventPublisher` (in-process, synchronous) and Apache Kafka (external message broker, asynchronous).

## Alternatives Considered

### Alternative 1: Spring ApplicationEventPublisher (Chosen)

Publish `StateChanged` events via Spring's built-in `ApplicationEventPublisher`. Listeners are `@EventListener`-annotated beans in the same JVM process.

- **Pros**:
  - Zero infrastructure — works out of the box with Spring Boot, no external dependencies
  - Establishes the hexagonal port contract (`EventPublisher` interface) immediately
  - Synchronous by default, so events are published within the same transaction as the state change (no consistency gaps)
  - Easy to test — mock the port or use `@EventListener` test utilities
  - Future Kafka migration is a matter of writing a new adapter implementing the same port — no domain or application layer changes
  - The domain event model (`StateChanged`) remains unchanged regardless of the publishing mechanism

- **Cons**:
  - Events are lost on JVM restart if not consumed before shutdown (acceptable at current scale)
  - Cannot be consumed by external services (by design — that's what Kafka would be for)
  - Synchronous by default — slow listeners block the transition response. Mitigation: `@Async` can be added later per listener

### Alternative 2: Apache Kafka

Run a Kafka broker (via Docker), define a `workflow-events` topic, and publish `StateChanged` events as Kafka records. Consumers can be in-process or external.

- **Pros**:
  - Events persist on disk and survive restarts
  - Multiple consumers (including external services) can subscribe independently
  - Async by default — the transition response is not blocked by slow consumers
  - Better fit for eventual consistency patterns and event-driven architectures

- **Cons**:
  - Significant infrastructure complexity: Kafka broker, ZooKeeper/KRaft, topic configuration, schema registry (optional but recommended)
  - Adds latency: every transition must wait for Kafka acknowledgment (or be fire-and-forget, which risks data loss)
  - Overkill for a single-service educational project with zero external consumers
  - Docker Compose becomes more complex; developers must run Kafka locally
  - Testing requires either a real Kafka broker (via Testcontainers) or complex mocking
  - No established port contract yet — would couple the application layer to Kafka's API or require the same port abstraction that Spring Events would establish anyway

### Alternative 3: Direct Listener Injection (Anti-pattern)

Inject a listener or callback directly into `WorkflowTransitionFacade` or `WorkflowEngine` without a port.

- **Pros**:
  - Fastest to implement
- **Cons**:
  - Tight coupling between the transition logic and event consumers
  - Violates hexagonal architecture principles
  - Cannot be migrated to Kafka without modifying the application layer
  - Testing requires mocking concrete listener implementations instead of a port

**Rejected** — provides no benefit over the port-based approach and incurs technical debt.

## Decision

We will implement a port-based event publishing layer using Spring's `ApplicationEventPublisher` as the first adapter.

Specifically:

1. Define an `EventPublisher` interface in `application/port/`
2. Implement `SpringEventPublisherAdapter` in `infrastructure/event/` that delegates to `ApplicationEventPublisher`
3. Implement `LoggingEventPublisherAdapter` (for the `dev-memory` profile) that logs events without publishing
4. Wire `EventPublisher` into `WorkflowTransitionFacade` and call `publish()` after each successful transition
5. Document the port contract so that a Kafka adapter can be added later without changing the application or domain layers

## Rationale

Spring Events was chosen over Kafka for three reasons:

1. **Zero infrastructure**: The project currently has no external consumers. Kafka would add complexity with no benefit at this stage. Spring Events works with the existing Spring Boot dependency.

2. **Port contract first**: The most important outcome is establishing the `EventPublisher` port in the application layer. Once the port exists, the underlying implementation can be swapped without touching the domain or use cases. Spring Events is the fastest way to validate this contract.

3. **Incremental migration path**: When Kafka becomes necessary (external consumers, higher scale), the migration path is:
   - Add Kafka dependency and Docker Compose service
   - Create `KafkaEventPublisherAdapter` implementing `EventPublisher`
   - Activate it with a Spring profile (`@Profile("kafka")`) or feature flag
   - The domain, application ports, and use cases remain unchanged

## Consequences

### Positive

- Clean hexagonal boundary: the application layer depends only on the `EventPublisher` port
- No infrastructure dependencies beyond Spring Boot
- Synchronous publishing means events are always published within the same transaction as the state change
- Easy to test: mock the port interface
- Future Kafka migration is isolated to a new adapter class

### Negative / Tradeoffs

- In-process events are lost on JVM restart if not consumed (acceptable for an educational project; production workloads would add a dead-letter queue or switch to Kafka)
- Synchronous default means slow event listeners block the HTTP response (mitigation: `@Async` on listeners, or switch to Kafka when latency becomes an issue)
- External services cannot consume events directly (by design — they would use Kafka when the need arises)
