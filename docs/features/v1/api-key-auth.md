# Feature: API Key Authentication

Secure all API endpoints with a static API key passed via the `X-API-Key` request header. Keys are configured through environment variables — no database table, no user management.

## Status

- **Iteration:** v0.6
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented (shell passes the key on every HTTP request)
- **Dependencies:** None

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Scope](#2-scope)
3. [How it works](#3-how-it-works)
4. [Configuration](#4-configuration)
5. [Implementation](#5-implementation)
6. [Frontend changes](#6-frontend-changes)
7. [Implementation Order](#7-implementation-order)
8. [Tests](#8-tests)
9. [Open Questions / Decisions Log](#9-open-questions--decisions-log)
10. [Changelog](#10-changelog)

---

## 1. Motivation

All endpoints are currently open — anyone with the server URL can create workflows, trigger transitions, or delete data. This cannot ship.

API key auth is the simplest security layer that closes this gap: one secret key per environment, passed in a header on every request. It follows the same model as Stripe, OpenAI, and most developer-facing APIs. No user sessions, no login flow, no JWT complexity.

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend** | `spring-boot-starter-security` dependency |
| **Backend** | `ApiKeyAuthFilter` — reads `X-API-Key` header, rejects with 401 if invalid |
| **Backend** | `SecurityFilterChain` — wires the filter, disables form login and CSRF, stateless sessions |
| **Backend** | `application.yml` property `workflow.security.api-keys` — a list of valid keys |
| **Backend** | Swagger/OpenAPI `@SecurityScheme` annotation so the Swagger UI shows an "Authorize" button |
| **Frontend** | `WorkflowEngineConfig` gains an optional `apiKey` field; the HTTP adapter sends `X-API-Key` on every request |

### Out of Scope

- Per-key permissions or roles — all valid keys have full access in v1
- Key rotation UI / runtime management — keys are rotated by updating the env var and restarting
- JWT / OAuth2 — heavier than needed for v1
- Rate limiting per key — v2

---

## 3. How it works

```
Client request
  │
  ├── Header present? X-API-Key: sk-abc123
  │         │
  │         ▼
  │   ApiKeyAuthFilter
  │     → key in configured list?
  │         ├── YES → set SecurityContext → continue to controller
  │         └── NO  → 401 Unauthorized (ProblemDetail)
  │
  └── Header missing?
            └── 401 Unauthorized (ProblemDetail)

Excluded from auth (no key required):
  /actuator/health
  /actuator/prometheus
  /swagger-ui/**
  /api-docs/**
```

The response on rejection follows the existing `ProblemDetail` pattern used by `GlobalExceptionHandler`:

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing or invalid API key"
}
```

---

## 4. Configuration

### 4.1 `application.yml`

```yaml
workflow:
  security:
    api-keys:
      - ${WORKFLOW_API_KEY_1:}
```

The `${WORKFLOW_API_KEY_1:}` syntax reads from the environment variable `WORKFLOW_API_KEY_1`, defaulting to empty string if not set (which means no valid keys — the filter will reject everything unless overridden).

Multiple keys are supported for rotation (keep old + new active during rollover):

```yaml
workflow:
  security:
    api-keys:
      - ${WORKFLOW_API_KEY_1:}
      - ${WORKFLOW_API_KEY_2:}
```

### 4.2 Local `.env` file

Create `.env` at the project root (already in `.gitignore`):

```env
WORKFLOW_API_KEY_1=sk-dev-localonly-changeme
```

Pass it to the backend process via IDE run config or `docker-compose` `env_file`:

```yaml
# docker-compose.yml
services:
  backend:
    env_file:
      - .env
```

### 4.3 `ApiKeysProperties`

```java
@ConfigurationProperties(prefix = "workflow.security")
public record ApiKeysProperties(List<String> apiKeys) {}
```

Enable with `@EnableConfigurationProperties(ApiKeysProperties.class)` on the application class or a `@Configuration` class.

---

## 5. Implementation

### 5.1 Dependency (`build.gradle.kts`)

```kotlin
implementation("org.springframework.boot:spring-boot-starter-security")
```

Adding Spring Security to the classpath auto-enables security. The `SecurityFilterChain` bean below replaces the default form-login auto-configuration.

### 5.2 `ApiKeyAuthFilter`

```java
// infrastructure/security/ApiKeyAuthFilter.java
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-API-Key";
    private final Set<String> validKeys;

    public ApiKeyAuthFilter(ApiKeysProperties properties) {
        this.validKeys = properties.apiKeys().stream()
            .filter(k -> k != null && !k.isBlank())
            .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String key = request.getHeader(HEADER);

        if (key != null && validKeys.contains(key)) {
            SecurityContextHolder.getContext().setAuthentication(
                new ApiKeyAuthentication(key)
            );
            chain.doFilter(request, response);
        } else {
            SecurityContextHolder.clearContext();
            sendUnauthorized(response);
        }
    }

    private void sendUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/problem+json");
        response.getWriter().write("""
            {"type":"about:blank","title":"Unauthorized","status":401,"detail":"Missing or invalid API key"}
            """);
    }
}
```

### 5.3 `ApiKeyAuthentication`

A minimal `Authentication` implementation — Spring Security requires one to be set in the `SecurityContext`.

```java
// infrastructure/security/ApiKeyAuthentication.java
public class ApiKeyAuthentication extends AbstractAuthenticationToken {

    private final String key;

    public ApiKeyAuthentication(String key) {
        super(List.of(new SimpleGrantedAuthority("ROLE_API")));
        this.key = key;
        setAuthenticated(true);
    }

    @Override public Object getCredentials() { return key; }
    @Override public Object getPrincipal() { return "api-key"; }
}
```

### 5.4 `SecurityFilterChain`

```java
// infrastructure/security/SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(ApiKeysProperties.class)
public class SecurityConfig {

    private final ApiKeyAuthFilter apiKeyAuthFilter;

    public SecurityConfig(ApiKeyAuthFilter apiKeyAuthFilter) {
        this.apiKeyAuthFilter = apiKeyAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/prometheus",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/api-docs/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### 5.5 Swagger security scheme

Add to the Spring Boot application class or a `@Configuration`:

```java
@SecurityScheme(
    name = "ApiKey",
    type = SecuritySchemeType.APIKEY,
    in = SecuritySchemeIn.HEADER,
    paramName = "X-API-Key"
)
```

Then annotate each controller (or use a global `@SecurityRequirement`):

```java
@SecurityRequirement(name = "ApiKey")
@RestController
public class WorkflowController { ... }
```

This adds an "Authorize" button to the Swagger UI where you can enter the key and have it included on all test requests.

---

## 6. Frontend changes

The shell app needs to include the API key on every HTTP request to the backend.

### 6.1 `WorkflowEngineConfig`

```typescript
export interface WorkflowEngineConfig {
  apiBaseUrl: string;
  apiKey?: string;      // optional — omit for open APIs
}
```

### 6.2 HTTP interceptor

Add a `ApiKeyInterceptor` to the library that reads the key from config and attaches it to every outgoing request:

```typescript
// lib/interceptors/api-key.interceptor.ts
export function apiKeyInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const config = inject(WORKFLOW_ENGINE_CONFIG);
  if (!config.apiKey) return next(req);

  return next(req.clone({
    setHeaders: { 'X-API-Key': config.apiKey }
  }));
}
```

Register it in `provideWorkflowEngine()`:

```typescript
export function provideWorkflowEngine(config: WorkflowEngineConfig) {
  return [
    { provide: WORKFLOW_ENGINE_CONFIG, useValue: config },
    withInterceptors([apiKeyInterceptor])
    // ...
  ];
}
```

### 6.3 Shell configuration

```typescript
// app.config.ts
provideWorkflowEngine({
  apiBaseUrl: environment.apiBaseUrl,
  apiKey: environment.apiKey          // read from Angular environment file
})
```

```typescript
// environments/environment.ts  (local dev — not committed)
export const environment = {
  apiBaseUrl: 'http://localhost:8080',
  apiKey: 'sk-dev-localonly-changeme'
};
```

---

## 7. Implementation Order

1. Add `spring-boot-starter-security` to `build.gradle.kts`
2. Create `ApiKeysProperties` config record
3. Add `workflow.security.api-keys` to `application.yml`
4. Create `.env` file with a local dev key (verify it's in `.gitignore`)
5. Create `ApiKeyAuthentication`
6. Create `ApiKeyAuthFilter`
7. Create `SecurityConfig` with `SecurityFilterChain`
8. Add `@SecurityScheme` + `@SecurityRequirement` to controllers
9. Verify: request without key → 401, with key → 200
10. Verify: `/actuator/health` and Swagger UI still open without key
11. Frontend: add `apiKey` to `WorkflowEngineConfig`
12. Frontend: create `ApiKeyInterceptor` and register it
13. Frontend: set key in `environment.ts`

---

## 8. Tests

| Test | What to verify |
|---|---|
| **Unit — `ApiKeyAuthFilter`** | Valid key → `SecurityContext` is set, filter chain continues |
| **Unit — `ApiKeyAuthFilter`** | Missing header → 401, chain does not continue |
| **Unit — `ApiKeyAuthFilter`** | Wrong key → 401 |
| **Unit — `ApiKeyAuthFilter`** | Blank/empty configured key is not treated as valid |
| **Integration** | `GET /workflows` without key → 401 |
| **Integration** | `GET /workflows` with valid key → 200 |
| **Integration** | `GET /actuator/health` without key → 200 (excluded) |
| **Integration** | `GET /swagger-ui.html` without key → 200 (excluded) |

---

## 9. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| One key or multiple? | **List of keys** | Enables zero-downtime key rotation: add new key, deploy, update clients, remove old key, redeploy. |
| Where stored? | **Env var → `application.yml`** | No DB table, no UI. Rotate by updating the env var and restarting. Good enough for v1. |
| Swagger open or protected? | **Open (no key required)** | Swagger is a dev tool. Restricting it would make local development painful. Document that it should be disabled or protected in production. |
| Key format? | **No enforced format** | `sk-` prefix is a convention (makes it easy to scan in logs and `grep` for accidental leaks), but not validated by the filter. Teams can choose their own format. |
| What if no keys are configured? | **All requests rejected** | An empty key list means the API is effectively locked. This is the safest default — misconfiguration fails closed. |

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-06-22 | Initial spec |
