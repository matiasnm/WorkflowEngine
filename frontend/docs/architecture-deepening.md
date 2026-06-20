# Architecture Deepening — Frontend (Angular)

Oportunidades de profundización arquitectónica identificadas mediante el skill `improve-codebase-architecture`. El lenguaje arquitectónico usado aquí sigue las definiciones de [`LANGUAGE.md`](../../.opencode/skills/engineering/improve-codebase-architecture/LANGUAGE.md) — términos como **Module**, **Interface**, **Depth**, **Seam**, **Adapter**, **Leverage** y **Locality** tienen significados precisos.

---

## 1. Primitiva reutilizable de carga asíncrona de datos

**Archivos involucrados:**  
`WorkflowListComponent`, `WorkflowDetailComponent`, `ExecutionDetailComponent`, `ExecutionListComponent`, `ExecutionHistoryComponent`, `WorkflowCreateComponent` (parcialmente)

**Problema:**  
El patrón `loading` / `error` / `subscribe({next, error})` se duplica **8+ veces** en el codebase. Cada componente gestiona independientemente:

```typescript
readonly loading = signal(true);
readonly error = signal<string | null>(null);

loadData(): void {
  this.loading.set(true);
  this.error.set(null);
  this.api.listWorkflows().subscribe({
    next: (data)  => { this.data.set(data); this.loading.set(false); },
    error: (err)  => { this.error.set(msg); this.errorEvent.emit(msg); this.loading.set(false); },
  });
}
```

Lo único que varía es: la fábrica del Observable, la señal de datos destino, y el mensaje de error. Cada instancia es **shallow** — su **interface** (los signals que expone y el patrón de suscripción) es casi tan compleja como su **implementation** (la llamada HTTP real).

**Test de borrado:** si se borra una instancia, su complejidad (`loading`/`error`) se mueve a un solo caller. Pero si se borran TODAS las instancias y se reemplazan por una primitiva compartida, la complejidad desaparece de los componentes por completo.

**Solución propuesta:**  
Extraer una utilidad que encapsule el ciclo de vida de datos asíncronos. Podría ser una función (similar a un composable):

```typescript
function asyncData<T>(
  factory: () => Observable<T>,
  options?: { errorMessage?: string; onError?: (err: unknown) => void }
): {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  refresh: () => void;
}
```

Los componentes llaman a la primitiva una vez por dependencia de datos:

```typescript
private readonly workflows = asyncData(() => this.api.listWorkflows(), {
  errorMessage: 'Failed to load workflows.',
  onError: (msg) => this.errorEvent.emit(msg as string),
});
```

y el template usa `workflows.loading()`, `workflows.error()`, `workflows.data()`.

**Beneficios:**

| Aspecto | Mejora |
|---|---|
| **Locality** | El ciclo loading/error vive en un solo **Module**. Un bug fix (timeout, logging, retry) toca un archivo, no 8. |
| **Leverage** | Los testers escriben un spec para la primitiva. Los tests de componente solo verifican que se llame con la fábrica correcta. |
| **Test surface** | La **interface** se reduce de N signals por componente a una sola llamada de función. |

---

## 2. Interfaces de servicio expuestas detrás de un Seam (patrón de dos Adapters)

**Archivos involucrados:**  
`WorkflowApiService`, `ExecutionApiService`, los 6 componentes

**Problema:**  
Los componentes inyectan clases concretas (`WorkflowApiService`, `ExecutionApiService`) directamente. No hay una **interface** abstracta — solo la clase misma. Esto significa:

- Cada test debe mockear la clase concreta usando `jasmine.createSpyObj`.
- No se puede intercambiar el **Adapter** (ej. un fake en memoria para Storybook, tests E2E o modo offline).
- Principio: **"one adapter = hypothetical seam; two adapters = real seam"**. Hoy solo existe el adapter HTTP, así que el seam es hipotético.

**Solución propuesta:**  
Definir una interfaz TypeScript (un port) para cada eje de servicio. El servicio actual la implementa. Proveer la implementación via `InjectionToken`. Crear un **Adapter** fake en memoria como segunda implementación. La inyección se intercambia a nivel de providers.

```typescript
// Port (interface)
export abstract class WorkflowApiPort {
  abstract listWorkflows(): Observable<WorkflowSummary[]>;
  abstract getWorkflow(id: string): Observable<WorkflowDetail>;
  abstract createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }>;
}

// Adapter HTTP (actual)
@Injectable({ providedIn: 'root' })
export class WorkflowApiHttpAdapter implements WorkflowApiPort { /* ... */ }

// Adapter fake (para tests/storybook)
@Injectable()
export class WorkflowApiFakeAdapter implements WorkflowApiPort { /* datos fijos */ }

// Provider switching
{ provide: WorkflowApiPort, useClass: WorkflowApiHttpAdapter }
```

**Beneficios:**

| Aspecto | Mejora |
|---|---|
| **Seam** | Los tests inyectan un **Adapter** fake en lugar de mockear HttpClient — más rápido, realista y menos frágil. |
| **Leverage** | El fake adapter sirve para todos los tests y demos. La host app puede intercambiar el adapter sin tocar componentes. |
| **Test surface** | Los tests de componente se simplifican: solo proveen el fake adapter con datos prefabricados. Sin `HttpTestingController`, sin `flush()`. |

---

## 3. Consolidar las rutas de carga duplicadas en ExecutionDetailComponent

**Archivos involucrados:**  
`ExecutionDetailComponent` (líneas 578–656)

**Problema:**  
`loadExecution()` y `refreshExecutionAndStates()` son **casi idénticas** — ambas llaman `forkJoin({ execution, nextStates })` con los mismos dos calls a la API. La única diferencia es el comportamiento en error (el refresh limpia `nextStates` silenciosamente, la carga inicial setea `error`). Además, el componente usa `@ViewChild(ExecutionHistoryComponent)` para llamar `loadHistory()` directamente — un acoplamiento leaky entre padre e hijo.

```typescript
// loadExecution()
forkJoin({
  execution: this.api.getExecution(this.executionId()),
  nextStates: this.api.getNextStates(this.executionId()),
}).subscribe({ ... });

// refreshExecutionAndStates() — casi idéntico
forkJoin({
  execution: this.api.getExecution(this.executionId()),
  nextStates: this.api.getNextStates(this.executionId()),
}).subscribe({ ... });
```

**Solución propuesta:**  
Unificar en un solo método `refresh(isInitial: boolean)` y reemplazar el `@ViewChild` con un enfoque reactivo — ej. un `refreshTrigger$` Subject al que tanto el stream de execution como el de history se suscriban.

```typescript
private readonly refresh$ = new Subject<void>();

constructor() {
  // Datos de execution + nextStates
  this.executionData$ = this.refresh$.pipe(
    startWith(void 0),
    switchMap(() => forkJoin({
      execution: this.api.getExecution(this.executionId()),
      nextStates: this.api.getNextStates(this.executionId()),
    })),
    shareReplay(1),
  );

  // History se refresca automáticamente sin @ViewChild
  this.history$ = this.refresh$.pipe(
    startWith(void 0),
    switchMap(() => this.api.getHistory(this.executionId())),
    shareReplay(1),
  );
}

refresh(): void {
  this.refresh$.next();
}
```

**Beneficios:**

| Aspecto | Mejora |
|---|---|
| **Locality** | Una sola ruta de carga, no dos. Un cambio en cómo se cargan los datos toca un método. |
| **Depth** | La **interface** del componente no cambia (un `@Input`, dos `@Output`), pero la **implementation** deja de duplicarse. |
| **Testability** | Se elimina `@ViewChild` del test surface — no hay que configurar mocks del `loadHistory()` del hijo. |

---

## 4. Separar la concern "Start Execution" de WorkflowDetailComponent

**Archivos involucrados:**  
`WorkflowDetailComponent` (líneas 418–493), `ExecutionApiService`

**Problema:**  
`WorkflowDetailComponent` maneja **tres concerns distintos**: (1) cargar/mostrar detalle del workflow, (2) ejecutar la acción "Start Execution" con su propio spinner/error state, (3) componer una lista de ejecuciones. El componente tiene 5 outputs y 5 señales de estado. Los estados `startingExecution` y `executionError` solo importan para el botón "Start Execution", pero viven al nivel del componente completo.

**Solución propuesta:**  
Extraer "Start Execution" a su propio sub-componente con una **interface** pequeña:

```typescript
@Component({
  selector: 'we-start-execution',
  // ...
})
export class StartExecutionComponent {
  @Input({ required: true }) workflowId!: string;
  @Output() executionCreated = new EventEmitter<string>();
  @Output() errorEvent = new EventEmitter<string>();

  // startingExecution, executionError viven AQUÍ
}
```

El `WorkflowDetailComponent` se convierte en un shell de composición puro.

**Beneficios:**

| Aspecto | Mejora |
|---|---|
| **Locality** | Si "Start Execution" evoluciona (diálogo de confirmación, polling, UI optimista), el cambio se aísla a un sub-módulo pequeño. |
| **Leverage** | El sub-módulo es independientemente testeable y reutilizable (podría aparecer también en la lista de workflows). |
| **Test surface** | Los tests de "Start Execution" ya no necesitan mockear `WorkflowApiService.getWorkflow()` — solo inyectan `ExecutionApiService`. |

---

## 5. Extraer átomos de UI compartidos de los estilos duplicados

**Archivos involucrados:**  
Los 6 componentes — cada uno tiene CSS inline con skeleton/shimmer, error banners, botones retry y spinners casi idénticos

**Problema:**  
El keyframe `@keyframes we-shimmer`, las clases `.we-skeleton-line`, el markup de error banner (`.we-error-icon` + `.we-error-text` + `.we-btn--retry`) y la animación `@keyframes we-spin` están **duplicados textualmente** en el array `styles` de cada componente. Son ~40 líneas de CSS por componente × 6 = 240 líneas duplicadas. Más allá del desperdicio de tokens, un cambio visual (ej. nuevo esqueleto) requiere editar 6 archivos.

**Solución propuesta:**  
Crear un archivo CSS compartido importado por todos los componentes, o pequeños componentes "átomo" (ej. `SkeletonCard`, `ErrorBanner`, `RetryButton`, `Spinner`) con una **interface** mínima:

```typescript
@Component({
  selector: 'we-error-banner',
  template: `
    <div class="we-error-banner" role="alert">
      <span class="we-error-icon" aria-hidden="true">⚠</span>
      <span class="we-error-text">{{ message() }}</span>
      @if (showRetry()) {
        <button class="we-btn we-btn--retry" (click)="retry.emit()">
          Retry
        </button>
      }
    </div>
  `,
})
export class ErrorBannerComponent {
  readonly message = input.required<string>();
  readonly showRetry = input(false);
  readonly retry = output<void>();
}
```

**Beneficios:**

| Aspecto | Mejora |
|---|---|
| **Locality** | Los cambios visuales y de accesibilidad tocan un archivo, no seis. |
| **Consistency** | Todos los componentes usan automáticamente el mismo skeleton, error banner y spinner — sin desviación. |
| **Depth** | Los componentes átomo tienen **interfaces** minúsculas (`@Input() message`, `@Output() retry`) pero encapsulan todo el markup, CSS y atributos ARIA asociados. |

---

## Prioridad sugerida

| # | Oportunidad | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Primitiva async data | Bajo (una función + buscar/reemplazar) | Alto (toca 5+ componentes) |
| 2 | Interfaces de servicio con seam | Medio (crear ports + fake adapter) | Alto (tests, Storybook, desacople) |
| 3 | Consolidar ExecutionDetail | Bajo (refactor local) | Medio (elimina duplicación y ViewChild) |
| 4 | Separar Start Execution | Medio (extraer componente) | Medio (mejora cohesión) |
| 5 | Átomos de UI compartidos | Bajo-Medio (crear 3-4 componentes átomo) | Alto (consistencia visual, mantenibilidad) |

---

*Documento generado a partir del análisis del skill `improve-codebase-architecture`. Fecha: 2026-06-20.*
