# Feature: Observability (Prometheus/Grafana + Structured Logging) + Webhooks

Consume the existing `StateChanged` Spring events for three purposes: exposing transition metrics to Prometheus/Grafana, emitting structured JSON logs for log aggregators, and calling per-execution callback URLs (webhooks) so external systems can react to state changes.

## Status

- **Iteration:** v0.6
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented (webhooks are API-only; no UI needed for metrics)
- **Dependencies:** `domain-events.md` (already implemented — events are published on every transition)

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Scope](#2-scope)
3. [Architecture](#3-architecture)
4. [Slice A — Metrics (Prometheus / Grafana)](#4-slice-a--metrics-prometheus--grafana)
5. [Slice B — Webhooks](#5-slice-b--webhooks)
6. [Slice C — Structured JSON Logging](#6-slice-c--structured-json-logging)
7. [Implementation Order](#7-implementation-order)
8. [Tests](#8-tests)
9. [Open Questions / Decisions Log](#9-open-questions--decisions-log)
10. [Changelog](#10-changelog)

---

## 1. Motivation

The `StateChanged` event is already published on every transition (see `domain-events.md`). Under the `jpa`/`pg` profiles it goes into Spring's `ApplicationEventPublisher`; under `memory` it is only logged. Nobody listens to these events yet.

Three independent consumers are valuable for v1:

- **Metrics**: How many transitions happened today? Which state are most executions stuck in? Prometheus + Grafana answer these without touching the application code again — just scrape `/actuator/prometheus`.
- **Structured logging**: Plain-text logs are unqueryable at scale. JSON logs let any log aggregator (ELK, Loki, Datadog) filter by `executionId`, `fromState`, or `toState` without regex, and correlate transitions with other services via `traceId`.
- **Webhooks**: Workflow engines exist to drive other systems. A per-execution callback URL lets callers register a URL when they start an execution and receive an HTTP POST every time the state changes. This is the primary integration mechanism.

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend — metrics** | `TransitionMetricsListener` — `@EventListener` that increments a Micrometer counter per transition |
| **Backend — metrics** | Actuator + Prometheus endpoint (`/actuator/prometheus`) |
| **Backend — metrics** | `docker-compose.yml` additions for Prometheus + Grafana |
| **Backend — metrics** | Prometheus scrape config (`prometheus.yml`) |
| **Backend — webhooks** | `callbackUrl` optional field on `WorkflowExecution` domain model |
| **Backend — webhooks** | `callbackUrl` nullable column on `workflow_execution` table (DB migration) |
| **Backend — webhooks** | `ExecutionController.start()` accepts optional `{ callbackUrl }` request body |
| **Backend — webhooks** | `WebhookDispatcherService` — fires HTTP POST to `callbackUrl` after each committed transition |
| **Backend — webhooks** | Async dispatch using `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` |
| **Backend — logging** | `logstash-logback-encoder` dependency + `logback-spring.xml` for JSON output |
| **Backend — logging** | `TransitionLoggingListener` — `@EventListener` that enriches MDC with `executionId`, `fromState`, `toState` and emits a structured log line per transition |

### Out of Scope

- Kafka or any external broker — Spring Events in-process is enough for both consumers
- Frontend UI for configuring webhooks — this is an API-level feature; callers pass the URL on execution start
- Grafana dashboard provisioning (JSON) — manual dashboard setup is fine for v1
- Webhook retries on failure — log and move on; retry logic is a v2 concern
- Webhook signature / HMAC verification — security hardening for v2
- Additional metrics beyond `workflow.transitions.total` — extend later

---

## 3. Architecture

```
Transition committed
       │
       ▼
WorkflowTransitionFacade
  → eventPublisher.publish(StateChanged)
       │
       ▼
SpringEventPublisherAdapter
  → ApplicationEventPublisher.publishEvent(StateChanged)
       │
       ├──────────────────────────┬───────────────────────────────┐
       ▼                          ▼                               ▼
TransitionMetricsListener  TransitionLoggingListener     WebhookDispatcherService
(@EventListener, sync)     (@EventListener, sync)        (@TransactionalEventListener AFTER_COMMIT, @Async)
  → counter.increment()      → MDC.put(executionId,…)      → fetch execution → callbackUrl?
       │                       → LOG.info(…)                → HTTP POST {callbackUrl}
       ▼                       → MDC.clear()
/actuator/prometheus                │
       │                            ▼
       ▼                     JSON log line
Prometheus scrape            (stdout / log aggregator)
       │
       ▼
Grafana dashboard
```

### Listener timing

| Listener | Phase | Why |
|---|---|---|
| `TransitionMetricsListener` | Synchronous `@EventListener` | Fast — just increments an in-memory counter. No I/O risk inside the transaction. |
| `WebhookDispatcherService` | `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` | Only fires if the transition committed. HTTP call runs in a separate thread — does not block the API response or hold the DB connection. |

---

## 4. Slice A — Metrics (Prometheus / Grafana)

### 4.1 Dependencies (`backend/build.gradle`)

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

### 4.2 Configuration (`application.yml`)

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, prometheus
  endpoint:
    prometheus:
      enabled: true
```

### 4.3 `TransitionMetricsListener`

```java
// infrastructure/metrics/TransitionMetricsListener.java
@Profile("!memory")
@Component
public class TransitionMetricsListener {

    private final MeterRegistry registry;

    public TransitionMetricsListener(MeterRegistry registry) {
        this.registry = registry;
    }

    @EventListener
    public void onStateChanged(StateChanged event) {
        Counter.builder("workflow.transitions.total")
            .tag("from_state", event.getFrom().code())
            .tag("to_state", event.getTo().code())
            .register(registry)
            .increment();
    }
}
```

**Why `@Profile("!memory")`**: under `memory` the `SpringEventPublisherAdapter` is not active, so Spring Events are not published — only the `LoggingEventPublisherAdapter` runs. No events reach this listener. Excluding the bean avoids confusion.

### 4.4 Metric exposed

```
# HELP workflow_transitions_total Total state transitions executed
# TYPE workflow_transitions_total counter
workflow_transitions_total{from_state="PENDING",to_state="APPROVED"} 12.0
workflow_transitions_total{from_state="APPROVED",to_state="REJECTED"} 3.0
```

### 4.5 Docker Compose additions

Add two services to `docker-compose.yml`:

```yaml
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infra/prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - backend

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 4.6 `infra/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'workflow-engine'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['backend:8080']
```

Create the file at `infra/prometheus.yml` in the project root.

### 4.7 Grafana setup (manual, v1)

1. Open `http://localhost:3001`, login `admin/admin`
2. Add datasource → Prometheus → URL `http://prometheus:9090`
3. Create dashboard → Add panel → Query `workflow_transitions_total`

---

## 5. Slice B — Webhooks

### 5.1 Domain model — `WorkflowExecution`

Add an optional `callbackUrl` field. All existing constructors add a `null` default so nothing breaks.

```java
public class WorkflowExecution {

    private final WorkflowExecutionId id;
    private final WorkflowId workflowId;
    private final State currentState;
    private final List<StateChanged> history;
    private final String callbackUrl; // nullable

    // Primary constructor (new executions, no webhook)
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState) {
        this(id, workflowId, currentState, List.of(), null);
    }

    // Factory for executions with a webhook
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState, String callbackUrl) {
        this(id, workflowId, currentState, List.of(), callbackUrl);
    }

    // Reconstruction constructor (persistence + testing)
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState,
                             List<StateChanged> history, String callbackUrl) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
        this.history = new ArrayList<>(history);
        this.callbackUrl = callbackUrl;
    }

    public String getCallbackUrl() { return callbackUrl; }

    public WorkflowExecution withTransition(State target, StateChanged event) {
        List<StateChanged> newHistory = new ArrayList<>(this.history);
        newHistory.add(event);
        return new WorkflowExecution(this.id, this.workflowId, target, newHistory, this.callbackUrl);
    }
    // ... existing getters unchanged
}
```

### 5.2 Persistence — entity

Add nullable `callback_url` column to `WorkflowExecutionEntity`:

```java
@Column(name = "callback_url", nullable = true, length = 2048)
private String callbackUrl;

// getter + setter
```

### 5.3 DB migration

Create `backend/src/main/resources/db/migration/V{next}__add_callback_url_to_execution.sql`:

```sql
ALTER TABLE workflow_execution
    ADD COLUMN callback_url VARCHAR(2048);
```

Check existing migrations to find the correct next version number.

### 5.4 Mapper update

In `WorkflowExecutionMapper`, map `callbackUrl` in both directions:

```java
// toDomain: pass entity.getCallbackUrl() into the reconstruction constructor
// toEntity: entity.setCallbackUrl(execution.getCallbackUrl())
```

### 5.5 In-memory repository

`InMemoryWorkflowExecutionRepository` stores `WorkflowExecution` objects directly, so no structural change is needed — `callbackUrl` is just carried on the domain object.

### 5.6 Use case — `StartWorkflowExecutionUseCase`

Add an overload that accepts an optional `callbackUrl`:

```java
@Transactional
public WorkflowExecution execute(WorkflowId workflowId) {
    return execute(workflowId, null);
}

@Transactional
public WorkflowExecution execute(WorkflowId workflowId, String callbackUrl) {
    Workflow workflow = workflowRepository.findById(workflowId)
        .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

    WorkflowExecution execution = new WorkflowExecution(
        new WorkflowExecutionId(UUID.randomUUID()),
        workflow.getId(),
        workflow.getInitialState(),
        callbackUrl
    );

    executionRepository.save(execution);
    return execution;
}
```

### 5.7 API — request DTO + controller

New DTO:

```java
// api/dto/StartExecutionRequest.java
public record StartExecutionRequest(
    @Nullable String callbackUrl
) {}
```

Update the controller endpoint:

```java
@PostMapping("/workflows/{workflowId}/executions")
public WorkflowExecutionCreatedResponse start(
        @PathVariable("workflowId") UUID workflowId,
        @RequestBody(required = false) StartExecutionRequest request
) {
    String callbackUrl = request != null ? request.callbackUrl() : null;
    return new WorkflowExecutionCreatedResponse(
        startUseCase.execute(new WorkflowId(workflowId), callbackUrl).getId().value()
    );
}
```

This is backwards-compatible — existing callers that POST with no body still work.

### 5.8 `WebhookDispatcherService`

```java
// infrastructure/webhook/WebhookDispatcherService.java
@Profile("!memory")
@Component
public class WebhookDispatcherService {

    private static final Logger LOG = LoggerFactory.getLogger(WebhookDispatcherService.class);

    private final WorkflowExecutionRepository executionRepository;
    private final RestClient restClient;

    public WebhookDispatcherService(WorkflowExecutionRepository executionRepository) {
        this.executionRepository = executionRepository;
        this.restClient = RestClient.create();
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStateChanged(StateChanged event) {
        executionRepository.findById(event.getExecutionId()).ifPresent(execution -> {
            String url = execution.getCallbackUrl();
            if (url == null || url.isBlank()) return;

            WebhookPayload payload = new WebhookPayload(
                event.getExecutionId().value(),
                execution.getWorkflowId().value(),
                event.getFrom().code(), event.getFrom().name(),
                event.getTo().code(), event.getTo().name(),
                event.getTimestamp()
            );

            try {
                restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
                LOG.info("Webhook delivered to {} for execution {}", url, event.getExecutionId());
            } catch (Exception ex) {
                LOG.warn("Webhook delivery failed for execution {} → {}: {}", event.getExecutionId(), url, ex.getMessage());
            }
        });
    }
}
```

### 5.9 Webhook payload

```java
// infrastructure/webhook/WebhookPayload.java
public record WebhookPayload(
    UUID executionId,
    UUID workflowId,
    String fromStateCode,
    String fromStateName,
    String toStateCode,
    String toStateName,
    Instant timestamp
) {}
```

The HTTP body sent to the callback URL:

```json
{
  "executionId": "3f1a…",
  "workflowId": "7b2c…",
  "fromStateCode": "PENDING",
  "fromStateName": "Pending",
  "toStateCode": "APPROVED",
  "toStateName": "Approved",
  "timestamp": "2026-06-22T14:30:00Z"
}
```

### 5.10 Async configuration

Add `@EnableAsync` to the Spring Boot application class (or a `@Configuration` class):

```java
@EnableAsync
@SpringBootApplication
public class WorkflowEngineApplication { ... }
```

---

## 6. Slice C — Structured JSON Logging

### 6.1 Dependency (`backend/build.gradle`)

```groovy
implementation 'net.logstash.logback:logstash-logback-encoder:8.0'
```

This library adds a Logback encoder that formats every log event as a single-line JSON object compatible with Logstash, ELK, Grafana Loki, and Datadog.

### 6.2 `logback-spring.xml`

Create `backend/src/main/resources/logback-spring.xml`. Spring Boot picks this up automatically and it supports `<springProfile>` blocks, so JSON can be enabled only in non-local profiles.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>

  <!-- Plain text for local development -->
  <springProfile name="memory | dev-jpa | dev-pg">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{HH:mm:ss.SSS} %-5level [%logger{36}] %msg%n</pattern>
      </encoder>
    </appender>
  </springProfile>

  <!-- Structured JSON for jpa / pg (CI, staging, production) -->
  <springProfile name="jpa | pg">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>
  </springProfile>

  <root level="INFO">
    <appender-ref ref="CONSOLE"/>
  </root>

</configuration>
```

### 6.3 `TransitionLoggingListener`

```java
// infrastructure/logging/TransitionLoggingListener.java
@Profile("!memory")
@Component
public class TransitionLoggingListener {

    private static final Logger LOG = LoggerFactory.getLogger(TransitionLoggingListener.class);

    @EventListener
    public void onStateChanged(StateChanged event) {
        try {
            MDC.put("executionId", event.getExecutionId().value().toString());
            MDC.put("fromState", event.getFrom().code());
            MDC.put("toState", event.getTo().code());
            LOG.info("State transition: {} → {}", event.getFrom().code(), event.getTo().code());
        } finally {
            MDC.remove("executionId");
            MDC.remove("fromState");
            MDC.remove("toState");
        }
    }
}
```

The `try/finally` guarantees MDC keys are removed even if `LOG.info` throws, preventing MDC leakage into subsequent log lines on the same thread.

### 6.4 JSON log output

Under the `jpa` or `pg` profile, every transition produces a log line like:

```json
{
  "@timestamp": "2026-06-22T14:30:00.123Z",
  "level": "INFO",
  "logger_name": "TransitionLoggingListener",
  "message": "State transition: PENDING → APPROVED",
  "executionId": "3f1a9b2c-...",
  "fromState": "PENDING",
  "toState": "APPROVED",
  "thread_name": "http-nio-8080-exec-3"
}
```

Fields added by `LogstashEncoder` automatically: `@timestamp`, `level`, `logger_name`, `message`, `thread_name`, `stack_trace` (on errors).  
Fields added by MDC: `executionId`, `fromState`, `toState`.

These fields are immediately queryable in any log aggregator without parsing — e.g., in Kibana: `fromState: PENDING AND toState: APPROVED`, or in Loki: `{job="workflow-engine"} | json | fromState="PENDING"`.

---

## 7. Implementation Order

### Slice A — Metrics

1. Add `spring-boot-starter-actuator` + `micrometer-registry-prometheus` to `build.gradle`
2. Configure `management.endpoints` in `application.yml`
3. Create `infrastructure/metrics/TransitionMetricsListener.java`
4. Create `infra/prometheus.yml`
5. Add Prometheus + Grafana services to `docker-compose.yml`
6. Start stack, fire a transition, verify `/actuator/prometheus` shows `workflow_transitions_total`
7. Add Prometheus datasource in Grafana and create a basic panel

### Slice C — Structured JSON Logging

1. Add `logstash-logback-encoder` to `build.gradle`
2. Create `src/main/resources/logback-spring.xml`
3. Create `infrastructure/logging/TransitionLoggingListener.java`
4. Start with `jpa` or `pg` profile, fire a transition, verify stdout shows JSON with `executionId`, `fromState`, `toState`

### Slice B — Webhooks

1. Update `WorkflowExecution` domain model (add `callbackUrl` field)
2. Add `callbackUrl` to `WorkflowExecutionEntity`
3. Write DB migration SQL
4. Update `WorkflowExecutionMapper` (both directions)
5. Update `StartWorkflowExecutionUseCase` (add overload)
6. Create `StartExecutionRequest` DTO
7. Update `ExecutionController.start()` to read the optional body
8. Create `WebhookPayload` record
9. Create `WebhookDispatcherService`
10. Add `@EnableAsync` to application class
11. Manual test: start an execution with `callbackUrl`, fire a transition, check the target receives the POST

---

## 8. Tests

| Test | What to verify |
|---|---|
| **Unit — `TransitionMetricsListener`** | `onStateChanged()` increments `workflow.transitions.total` counter with correct `from_state` / `to_state` tags |
| **Unit — `TransitionLoggingListener`** | `onStateChanged()` sets `executionId`, `fromState`, `toState` in MDC before logging and clears them in `finally` |
| **Unit — `TransitionLoggingListener`** | MDC is cleared even when `LOG.info` throws |
| **Unit — `WebhookDispatcherService`** | When execution has a `callbackUrl`, posts the correct payload to that URL |
| **Unit — `WebhookDispatcherService`** | When execution has no `callbackUrl`, no HTTP call is made |
| **Unit — `WebhookDispatcherService`** | When HTTP POST fails (4xx/5xx/timeout), exception is caught and logged — no exception propagates |
| **Unit — `StartWorkflowExecutionUseCase`** | `execute(workflowId, callbackUrl)` saves an execution with the given `callbackUrl` |
| **Unit — `WorkflowExecution`** | `withTransition()` preserves `callbackUrl` on the new instance |
| **Integration — mapper** | `callbackUrl` round-trips through entity ↔ domain mapping |

---

## 9. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Where is `callbackUrl` configured? | **Per-execution** — passed at `POST /workflows/{id}/executions` | Simplest model: the caller owns the URL. No schema change to the workflow definition. No coordination needed between workflow designer and caller. |
| When should the webhook fire? | **`@TransactionalEventListener(AFTER_COMMIT)`** | Guarantees the transition is durable before calling out. If the transaction rolls back, no spurious webhook fires. |
| Should the webhook block the API response? | **No — `@Async`** | HTTP calls inside a transaction hold the DB connection and add latency to the API. Fire-and-forget is appropriate for v1. |
| What happens on webhook failure? | **Log and move on** | No retry in v1. Callers should implement idempotency on their side. Retry infrastructure (exponential backoff, dead-letter) is a v2 concern. |
| Should the frontend support `callbackUrl`? | **No, out of scope** | Webhooks are a backend-to-backend integration. The `start-execution` library component has no use for a callback URL — the shell app doesn't need it. API-first. |
| Metrics under `memory` profile? | **Excluded (`@Profile("!memory")`)** | `memory` uses `LoggingEventPublisherAdapter` which does not publish to Spring Events, so `@EventListener` beans would never be called anyway. |
| JSON logging in local dev? | **Plain text for `memory`/`dev-*`, JSON for `jpa`/`pg`** | JSON is machine-readable but hard to scan visually. `logback-spring.xml` with `<springProfile>` blocks lets each profile choose its format without runtime flags. |
| Why `logstash-logback-encoder` over Spring Boot 3.4 native JSON? | **`logstash-logback-encoder`** | More ecosystem support (Kibana, Loki, Datadog all expect the `@timestamp` + `message` field names it produces). Spring Boot native JSON logging (3.4+) is an alternative if avoiding the extra dependency is preferred. |

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-06-22 | Initial spec |
