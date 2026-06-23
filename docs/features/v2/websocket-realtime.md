# Feature: WebSocket Real-Time Updates

Push state change notifications to connected frontend clients in real time, eliminating the need for polling.

## Status

- **Iteration:** v2
- **Deferred because:** Polling works fine for v1 use cases. WebSocket adds infrastructure complexity (connection management, reconnect logic, auth over WS) that isn't justified until there is a clear need for sub-second UI responsiveness.

---

## Motivation

Today the frontend must poll (`GET /executions/{id}`) to detect state changes. This works but:
- Adds latency between a transition and the UI reflecting it
- Wastes requests when nothing has changed
- Creates load on the backend proportional to the number of open browser tabs

WebSocket push eliminates polling — the backend sends an update the moment a transition is committed.

---

## Key Design Questions

- **Protocol:** WebSocket (raw) or STOMP over WebSocket (Spring's `spring-boot-starter-websocket` provides STOMP support out of the box)?
- **Subscription model:** Per-execution (`/topic/executions/{id}`), per-workflow (`/topic/workflows/{id}/executions`), or global (`/topic/events`)? Per-execution is most precise but requires a new subscription for each execution the UI is viewing.
- **Auth:** API keys don't naturally translate to WebSocket auth. The handshake HTTP request can carry the key, but keeping the connection secure after upgrade requires thought.
- **Existing event infrastructure:** The `SpringEventPublisherAdapter` already fires `StateChanged` via Spring Events. A WebSocket broadcaster would be another `@EventListener` — the publishing side is already in place.
- **Fallback:** Clients that can't maintain a WebSocket connection should fall back gracefully to polling.

---

## Rough Implementation Sketch

1. Add `spring-boot-starter-websocket` dependency
2. Configure STOMP WebSocket endpoint and message broker
3. `WebSocketBroadcaster` — `@EventListener` on `StateChanged` that sends to `/topic/executions/{executionId}`
4. Frontend: Angular service that opens a STOMP connection and subscribes to the relevant topic, updating the execution signal on receipt

---

## Dependencies

- `domain-events.md` — already implemented; events are the source
- API key auth — must extend to WS handshake
