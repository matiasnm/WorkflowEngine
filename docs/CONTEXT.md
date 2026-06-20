# WorkflowEngine — Frontend Context

## Domain Glossary

### Workflow
Defines the **rules of the system**:
- States
- Transitions
- Initial state

### State
A step within a Workflow. Has a `code` (stable identifier, used as FK target), a `name` (display label), and a `terminal` flag.

### Transition
A valid move from one State to another. Defined within a Workflow. A terminal state cannot have outgoing transitions.

### WorkflowExecution
A **running instance** of a Workflow. Created by starting a Workflow. Tracks:
- Current state
- History of state changes

### StateChanged
A domain event recording that a WorkflowExecution transitioned from one State to another, with a timestamp.

### WorkflowEngine
Pure domain service that validates transitions and applies state changes. The sole mutator of WorkflowExecution.

## Architecture Decisions

### Library Architecture
- Angular workspace with two projects:
  - `projects/workflow-engine/` — **reusable library** (ng-packagr). Exports models, services, and standalone components.
  - `projects/shell/` — **SPA de desarrollo/demo** que consume la librería.
- Otras apps importan la librería como dependencia npm (local o publicada).

### Library Surface (Level B)
- **Models**: interfaces del dominio (Workflow, State, Transition, WorkflowExecution, StateChanged)
- **Services**: API clients (WorkflowApiService, ExecutionApiService)
- **Components**: WorkflowListComponent, WorkflowDetailComponent, ExecutionDetailComponent, ExecutionHistoryComponent
- **No incluye**: configuración de rutas, providers globales, layout propio

### API Client Configuration
- Patrón `provideWorkflowEngine(config: WorkflowEngineConfig)` con `InjectionToken`
- La host app llama `provideWorkflowEngine({ apiBaseUrl: 'http://localhost:8080' })` en sus providers
- Servicios internos usan `HttpClient` inyectado + base URL del token

### Styling Strategy
- CSS Custom Properties con prefijo `--we-` para namespacing
- La librería define valores default con aspecto profesional minimalista
- La host app sobrescribe variables (`--we-primary`, `--we-border-radius`, etc.)
- La shell app (demo) puede incluir Angular Material adicional para enriquecer la demo
- La librería no fuerza ninguna dependencia de UI framework a la host app

### State Management
- Servicios retornan `Observable<T>` usando `HttpClient` estándar
- Componentes convierten a signals via `toSignal(obs$, { initialValue: ... })`
- Loading/error states manejados manualmente con `signal()`
- Sin stores externos ni dependencias de estado en el MVP

### Component Contracts
- **Filosofía**: componentes autónomos (se buscan sus propios datos por API)
- Reciben solo `@Input()` de identidad (IDs, config)
- Emiten `@Output()` para que la host app orqueste navegación
- Sin conocimiento de rutas dentro de la librería

### Error Handling
- Cada componente muestra errores inline via `signal<string | null>(null)`
- Además emite `@Output() errorEvent = new EventEmitter<string>()` para que la host app pueda reaccionar (toast, notificación, etc.)
- El componente siempre se recupera visualmente: el error no rompe el estado

### Componentes del MVP

| Componente | Inputs | Outputs |
|---|---|---|
| `WorkflowListComponent` | `title?: string` | `workflowSelected: UUID` |
| `WorkflowDetailComponent` | `workflowId: UUID` | `executionCreated: UUID`, `back: void` |
| `ExecutionDetailComponent` | `executionId: UUID` | `transitionExecuted: TransitionResponse`, `back: void` |
| `ExecutionHistoryComponent` | `executionId: UUID`, `displayMode: 'horizontal' \| 'vertical'` | — |

### Interaction Pattern
- **Transiciones**: modo pesimista (call API → esperar respuesta → actualizar UI)
- Botón muestra spinner y se deshabilita durante la llamada
- Error no deja la UI en estado inconsistente

### Loading States
- **Carga inicial** (listas, detalles): skeleton/shimmer que refleja la estructura del contenido
- **Acciones** (transición, crear ejecución): spinner inline en el botón
- **Refrescos**: no recargar skeleton completo, solo actualizar datos

### Testing Strategy
- **MVP**: tests unitarios de servicios (HttpClientTestingController) + tests unitarios de componentes (TestBed con mocks)
- **Post-MVP**: E2E con Playwright para la shell app (flujo completo)
- Los tests se ejecutan en el pipeline CI del workspace

### Layout de vistas
- **WorkflowDetail**: tabla de estados + lista de transiciones (sin grafo visual en MVP)
- **ExecutionDetail**: estado actual grande + botones de transición + history embebida abajo
- **ExecutionHistory**: timeline horizontal o vertical según `displayMode` (default vertical)
- **Start Execution**: botón en detail → POST → emite `executionCreated` → host app navega

## Language Rules

- Use **Execution**, never "Instance" — the backend uses `WorkflowExecution` everywhere.
- Use **State**, never "Status" — State is a first-class domain concept with code/name/terminal.
- Use **Transition** for both the definition (Workflow rule) and the act of moving between states.
- Use **Shell** for the demo/dev app; use **Library** or **Host App** for the reusable artifact.
