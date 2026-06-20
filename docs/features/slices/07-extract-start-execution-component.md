# Slice 7 — Extract `StartExecutionComponent` from `WorkflowDetailComponent`

**Type:** AFK
**Blocked by:** None (or Slice 1 if using `asyncData`)

## Parent

Derived from opportunity \#4 in `docs/features/frontend-architecture-deepening.md` — "Separar la concern 'Start Execution' de WorkflowDetailComponent".

## What to build

Extract the "Start Execution" concern — currently inline in `WorkflowDetailComponent` (lines 93–113 in template, lines 472–488 in class) — into its own standalone `StartExecutionComponent`.

### Component interface

```typescript
@Component({
  selector: 'we-start-execution',
  standalone: true,
  // imports: [...]
})
export class StartExecutionComponent {
  @Input({ required: true }) workflowId!: string;
  @Output() executionCreated = new EventEmitter<string>();
  @Output() errorEvent = new EventEmitter<string>();

  // These signals move FROM WorkflowDetailComponent:
  readonly startingExecution = signal(false);
  readonly executionError = signal<string | null>(null);

  start(): void { /* ... */ }
}
```

### Template to move

The button with spinner, the "Starting…" text, and the execution error banner — all self-contained.

### Changes to `WorkflowDetailComponent`

- Remove `startingExecution`, `executionError` signals
- Remove `startExecution()` method
- Remove the Start Execution button section from template
- Add `<we-start-execution [workflowId]="workflowId()" (executionCreated)="onExecutionCreated($event)" (errorEvent)="errorEvent.emit($event)" />`
- The `executionCreated` output is forwarded from the new sub-component

### Optional: Use `asyncData()` from Slice 1
If available, the execution creation call can use `asyncData()` for cleaner state management.

## Acceptance criteria

- [ ] `StartExecutionComponent` exists at `src/lib/components/start-execution/start-execution.component.ts`
- [ ] Component is standalone with `@Input { required } workflowId`, `@Output executionCreated`, `@Output errorEvent`
- [ ] Start button with spinner/disabled state and error banner are self-contained in the new component
- [ ] `WorkflowDetailComponent` no longer has `startingExecution`, `executionError` signals or `startExecution()` method
- [ ] `WorkflowDetailComponent` template uses `<we-start-execution>` composition
- [ ] `StartExecutionComponent` has its own `.spec.ts` with tests
- [ ] `WorkflowDetailComponent` tests updated (simpler — no need to mock ExecutionApiService for start)
- [ ] External behavior preserved: clicking Start Execution still emits `executionCreated` with the execution ID
- [ ] All existing tests pass
