# MVP — Frontend (Angular)

## 1. Objetivo del MVP

Construir una **librería Angular reusable** que permita visualizar y操作 workflows del backend WorkflowEngine, empaquetada como artifact publicable para que otras aplicaciones Angular la consuman.

### ¿Qué NO incluye el MVP?
- Autenticación/Autorización
- Diseño responsive avanzado
- Grafo visual de workflows (diagrama de estados)
- Multi-tenancy
- Panel de administración
- Notificaciones en tiempo real (WebSockets)
- Modo offline

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Angular 19 (Standalone APIs) |
| Lenguaje | TypeScript 5.x estricto |
| Reactividad | Signals (`toSignal`, `signal`, `computed`) |
| HTTP | Angular `HttpClient` |
| Estilos | CSS Custom Properties (`--we-*`) |
| Build | Vite (Angular CLI por defecto) |
| Testing | Jasmine + Karma (unit tests) |
| E2E | Playwright (post-MVP) |

---

## 3. Arquitectura del workspace

```
frontend/
├── angular.json
├── package.json
├── tsconfig.json
│
├── projects/
│   ├── workflow-engine/                ← Librería reusable (ng-packagr)
│   │   ├── ng-package.json
│   │   ├── package.json                ← peerDependencies declara @angular/common, etc.
│   │   └── src/lib/
│   │       ├── models/
│   │       │   ├── workflow.model.ts
│   │       │   └── execution.model.ts
│   │       ├── services/
│   │       │   ├── workflow-api.service.ts
│   │       │   └── execution-api.service.ts
│   │       ├── components/
│   │       │   ├── workflow-list/
│   │       │   ├── workflow-detail/
│   │       │   ├── execution-detail/
│   │       │   └── execution-history/
│   │       ├── config/
│   │       │   └── workflow-engine.config.ts
│   │       └── public-api.ts
│   │
│   └── shell/                          ← SPA de desarrollo/demo
│       └── src/app/
│           ├── app.component.ts
│           ├── app.config.ts
│           └── app.routes.ts
│
├── docs/
│   └── CONTEXT.md                      ← Glosario y decisiones
│
└── mvp.md                              ← Este documento
```

---

## 4. API pública de la librería

### 4.1 Configuración

```typescript
// La host app provee la URL del backend
export const appConfig: ApplicationConfig = {
  providers: [
    provideWorkflowEngine({ apiBaseUrl: 'http://localhost:8080' }),
  ]
};
```

### 4.2 Modelos (TypeScript interfaces)

```typescript
export interface WorkflowSummary {
  id: string;    // UUID
  name: string;
}

export interface StateDefinition {
  code: string;
  name: string;
  terminal: boolean;
}

export interface TransitionDefinition {
  from: string;  // state code
  to: string;    // state code
}

export interface WorkflowDetail {
  id: string;
  name: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  initialState: string;
}

export interface ExecutionResponse {
  id: string;
  workflowId: string;
  currentState: StateDefinition;
}

export interface TransitionResponse {
  executionId: string;
  previousStateCode: string;
  previousStateName: string;
  currentStateCode: string;
  currentStateName: string;
  timestamp: string;  // ISO-8601
}

export interface HistoryItem {
  fromStateCode: string;
  fromStateName: string;
  toStateCode: string;
  toStateName: string;
  timestamp: string;
}
```

### 4.3 Servicios

```typescript
@Injectable({ providedIn: 'root' })
class WorkflowApiService {
  listWorkflows(): Observable<WorkflowSummary[]>;
  getWorkflow(id: string): Observable<WorkflowDetail>;
}

@Injectable({ providedIn: 'root' })
class ExecutionApiService {
  startExecution(workflowId: string): Observable<{ executionId: string }>;
  getExecution(id: string): Observable<ExecutionResponse>;
  transition(executionId: string, targetStateCode: string): Observable<TransitionResponse>;
  getNextStates(executionId: string): Observable<NextStatesResponse[]>;
  getHistory(executionId: string): Observable<HistoryItem[]>;
}
```

### 4.4 Componentes

| Componente | Inputs | Outputs | Descripción |
|---|---|---|---|
| `WorkflowListComponent` | `title?: string` | `workflowSelected: string`, `errorEvent: string` | Lista de workflows con loading/empty/error states |
| `WorkflowDetailComponent` | `workflowId: string` | `executionCreated: string`, `back: void`, `errorEvent: string` | Detalle del workflow + botón Start Execution |
| `ExecutionDetailComponent` | `executionId: string` | `transitionExecuted: TransitionResponse`, `back: void`, `errorEvent: string` | Estado actual + botones de transición + history |
| `ExecutionHistoryComponent` | `executionId: string`, `displayMode?: 'vertical' \| 'horizontal'` | — | Timeline de cambios de estado |

### 4.5 Rutas (definidas por la host app, NO por la librería)

```typescript
// Ejemplo de uso en la host app:
export const routes: Routes = [
  { path: '', loadComponent: () => import('workflow-engine').then(m => m.WorkflowListComponent) },
  { path: 'workflows/:id', loadComponent: () => import('workflow-engine').then(m => m.WorkflowDetailComponent) },
  { path: 'executions/:id', loadComponent: () => import('workflow-engine').then(m => m.ExecutionDetailComponent) },
];
```

---

## 5. Contratos de los componentes

### 5.1 WorkflowListComponent

```
┌──────────────────────────────────┐
│  Workflows                       │  ← title (opcional)
│                                  │
│  [Loading... skeleton]           │  ← estado de carga
│  ┌────────────────────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓                │  │
│  └────────────────────────────┘  │
│                                  │
│  [Empty state]                   │  ← si no hay workflows
│  No workflows found. Create      │
│  one via the API.                │
│                                  │
│  [Error state]                   │  ← si falla la API
│  ⚠ Failed to load workflows.    │
│  [Retry]                         │
│                                  │
│  [Data loaded]                   │
│  ┌────────────────────────────┐  │
│  │ 📋 simple-approval         │  │  ← click → workflowSelected
│  │   4 states · 3 transitions  │  │
│  ├────────────────────────────┤  │
│  │ 📋 order-fulfillment       │  │
│  │   5 states · 6 transitions  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Comportamiento:**
- Al montarse, carga `GET /workflows`
- Muestra skeleton mientras carga
- Cada item muestra nombre + resumen (# estados, # transiciones)
- Click en un item emite `workflowSelected` con el UUID
- Si error → mensaje inline + botón retry
- Si vacío → mensaje informativo

### 5.2 WorkflowDetailComponent

```
┌──────────────────────────────────┐
│  ← Back                          │  ← emite back
│  simple-approval                 │  ← nombre del workflow
│                                  │
│  States                          │
│  ┌──────┬────────────┬─────────┐ │
│  │ Code │ Name       │ Terminal│ │
│  ├──────┼────────────┼─────────┤ │
│  │ created │ CREATED │ No      │ │
│  │ in_review │ IN_REVIEW │ No  │ │
│  │ approved │ APPROVED │ Yes   │ │
│  │ rejected │ REJECTED │ Yes   │ │
│  └──────┴────────────┴─────────┘ │
│                                  │
│  Transitions                     │
│  ┌──────────────────────────────┐│
│  │ CREATED → IN_REVIEW         ││
│  │ IN_REVIEW → APPROVED        ││
│  │ IN_REVIEW → REJECTED        ││
│  └──────────────────────────────┘│
│                                  │
│  [▶ Start Execution]             │  ← button
│    (solo si no estamos en una    │
│     ejecución activa)            │
│                                  │
│  [Loading...] skeleton           │
│  [Error] ⚠ mensaje + retry      │
└──────────────────────────────────┘
```

**Comportamiento:**
- Input `workflowId` → carga `GET /workflows/{workflowId}`
- Muestra tabla de estados y lista de transiciones
- Botón "Start Execution" → `POST /workflows/{workflowId}/executions`
- Éxito → emite `executionCreated` con el execution UUID
- Error → muestra error inline
- Botón Back emite `back`

### 5.3 ExecutionDetailComponent

```
┌──────────────────────────────────┐
│  ← Back                          │  ← emite back
│  Execution #a1b2...              │  ← UUID truncado
│                                  │
│  Current State                   │
│  ┌────────────────────────────┐  │
│  │     IN_REVIEW              │  │  ← estado actual, grande
│  │     Since 10:05 AM         │  │
│  └────────────────────────────┘  │
│                                  │
│  Available Transitions           │
│  ┌────────────────────────────┐  │
│  │ [→ APPROVED]  ── spinner   │  │  ← botón, click → transiciona
│  ├────────────────────────────┤  │
│  │ [→ REJECTED]               │  │
│  └────────────────────────────┘  │
│                                  │
│  History                         │
│  ┌────────────────────────────┐  │
│  │ CREATED → IN_REVIEW        │  │  ← ExecutionHistoryComponent
│  │ 2026-06-19 10:00           │  │     embebido
│  └────────────────────────────┘  │
│                                  │
│  [Loading...] skeleton           │
│  [Error] ⚠ mensaje + retry      │
│  [Terminal state]                │
│  ✓ Workflow complete. Final     │
│    state: APPROVED               │
└──────────────────────────────────┘
```

**Comportamiento:**
- Input `executionId` → carga `GET /executions/{executionId}` + `GET /executions/{executionId}/next-states`
- Muestra estado actual destacado
- Botones por cada next state disponible
- Click en botón de transición:
  1. Botón → spinner + disabled (pesimista)
  2. `POST /executions/{executionId}/transition` con `{ targetStateCode }`
  3. Éxito → actualiza estado actual + recarga next-states + history se actualiza
  4. Error → muestra error inline, botón se re-habilita
- Si estado actual es terminal: muestra mensaje de finalización, oculta botones de transición

### 5.4 ExecutionHistoryComponent

**Modo vertical (default):**
```
┌──────────────────────────────────┐
│  Timeline                        │
│                                  │
│  ▲ IN_REVIEW                     │  ← estado actual (current)
│  │                               │
│  ● CREATED → IN_REVIEW           │
│      2026-06-19 10:05 AM         │
│                                  │
│  ● CREATED                       │  ← estado inicial
│      2026-06-19 10:00 AM         │
│                                  │
│  [Loading...] skeleton horizontal│
│  [Empty] No history available    │
└──────────────────────────────────┘
```

**Modo horizontal:**
```
┌──────────────────────────────────────────────────┐
│  Timeline                                        │
│                                                  │
│  ── CREATED ──→ IN_REVIEW ──→ ●APPROVED          │
│      10:00 AM         10:05 AM       (current)   │
│                                                  │
│  [Loading...] skeleton horizontal                │
│  [Empty] No history available                    │
└──────────────────────────────────────────────────┘
```

---

## 6. Estados de UI por componente

| Componente | Loading | Empty | Error | Success |
|---|---|---|---|---|
| WorkflowList | Skeleton (3 rows) | "No workflows" text | ⚠ + "Retry" button | Lista de items |
| WorkflowDetail | Skeleton (full layout) | — (404 = error) | ⚠ + "Retry" button | States + Transitions + Start btn |
| ExecutionDetail | Skeleton (state + btns) | — (404 = error) | ⚠ + "Retry" button | Current state + transition btns |
| ExecutionHistory | Skeleton row | "No history" text | ⚠ inline | Timeline |

---

## 7. CSS Custom Properties (tema)

```css
/* Valores por defecto de la librería */
:root {
  --we-primary: #1976d2;
  --we-primary-hover: #1565c0;
  --we-danger: #d32f2f;
  --we-success: #388e3c;
  --we-warning: #f57c00;
  --we-bg: #ffffff;
  --we-bg-secondary: #f5f5f5;
  --we-text: #212121;
  --we-text-secondary: #757575;
  --we-border: #e0e0e0;
  --we-border-radius: 8px;
  --we-spacing: 16px;
  --we-font-family: system-ui, -apple-system, sans-serif;
}
```

La host app puede sobrescribir cualquier variable:
```css
:root {
  --we-primary: #ff5722;
  --we-border-radius: 4px;
}
```

---

## 8. Testing

### Servicios (unittest con HttpClientTestingController)

| Test | Qué verifica |
|---|---|
| `listWorkflows()` | Llama `GET /workflows`, retorna `WorkflowSummary[]` |
| `getWorkflow(id)` | Llama `GET /workflows/{id}`, retorna `WorkflowDetail` |
| `startExecution(wfId)` | Llama `POST /workflows/{id}/executions`, retorna executionId |
| `transition(execId, code)` | Llama `POST /executions/{id}/transition` con `{ targetStateCode }` |
| `getNextStates(execId)` | Llama `GET /executions/{id}/next-states` |
| `getHistory(execId)` | Llama `GET /executions/{id}/history` |
| Error handling | Verifica que errores HTTP se propagan correctamente |

### Componentes (unittest con TestBed + mocks)

| Componente | Tests clave |
|---|---|
| WorkflowList | loading state, renders list, emits on click, error state, empty state |
| WorkflowDetail | loading state, renders states & transitions, start execution flow, error state, back |
| ExecutionDetail | loading state, renders current state, transition buttons, transition flow, terminal state, error |
| ExecutionHistory | renders vertical timeline, renders horizontal timeline, loading, empty |

---

## 9. Criterio de éxito del MVP

El MVP es exitoso si:

1. La librería se puede instalar en una app Angular vacía via `npm install`
2. Con solo `provideWorkflowEngine({ apiBaseUrl })` + 3 rutas, la host app tiene workflows funcionales
3. Se puede completar el flujo completo:
   - Listar workflows → Ver detalle → Iniciar ejecución → Ver estado → Transicionar → Ver history
4. Todos los estados de UI (loading, empty, error, success) son manejados visualmente
5. La shell app de desarrollo funciona con `ng serve` contra el backend real

---

## 10. Entregables

1. **Código fuente** en `/frontend/projects/workflow-engine/`
2. **Shell app demo** en `/frontend/projects/shell/`
3. **Tests unitarios** (>80% cobertura en servicios, >70% en componentes)
4. **Documentación** (`CONTEXT.md`, `mvp.md`)

---

## 11. Extensiones post-MVP (no incluidas)

- Grafo visual de estados/transiciones (D3.js / vis-network)
- WebSocket para actualizaciones en tiempo real
- Componentes de administración (editar workflow, eliminar execution)
- E2E tests con Playwright
- Publicación a npm registry
- Internacionalización (i18n)
- Theming dinámico (cambio de tema en runtime)
