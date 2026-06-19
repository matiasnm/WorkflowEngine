import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowListComponent } from './workflow-list.component';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { WorkflowSummary } from '../../models';

describe('WorkflowListComponent', () => {
  let component: WorkflowListComponent;
  let fixture: ComponentFixture<WorkflowListComponent>;
  let apiServiceSpy: jasmine.SpyObj<WorkflowApiService>;

  const mockWorkflows: WorkflowSummary[] = [
    { id: 'uuid-1', name: 'simple-approval', statesCount: 4, transitionsCount: 3 },
    { id: 'uuid-2', name: 'order-fulfillment', statesCount: 5, transitionsCount: 6 },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('WorkflowApiService', ['listWorkflows']);

    await TestBed.configureTestingModule({
      imports: [WorkflowListComponent],
      providers: [
        { provide: WorkflowApiService, useValue: spy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(WorkflowApiService) as jasmine.SpyObj<WorkflowApiService>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(WorkflowListComponent);
    component = fixture.componentInstance;
  }

  describe('loading state', () => {
    it('should show skeleton shimmer on mount while data is loading', () => {
      const subject = new Subject<WorkflowSummary[]>();
      apiServiceSpy.listWorkflows.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();

      // Should show skeleton while loading
      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-list__skeleton');
      expect(skeleton).toBeTruthy();
      // Should have 3 skeleton placeholder rows
      expect(skeleton.children.length).toBe(3);
      expect(skeleton.children[0].classList).toContain('we-skeleton-card');

      // Data arrives
      subject.next(mockWorkflows);
      subject.complete();
      fixture.detectChanges();

      // Skeleton should be gone, cards should be visible
      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-workflow-list__skeleton');
      expect(skeletonAfter).toBeFalsy();
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(2);
    });

    it('should set loading to false when API call fails', () => {
      apiServiceSpy.listWorkflows.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();

      // After error, loading should be false
      expect(component.loading()).toBeFalse();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      apiServiceSpy.listWorkflows.and.returnValue(of(mockWorkflows));
      createComponent();
      fixture.detectChanges();
    });

    it('should render workflow cards for each workflow', () => {
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(2);
    });

    it('should display workflow name in each card', () => {
      const nameElements = fixture.nativeElement.querySelectorAll('.we-workflow-card__name');
      expect(nameElements[0].textContent).toContain('simple-approval');
      expect(nameElements[1].textContent).toContain('order-fulfillment');
    });

    it('should display workflow summary with states and transitions counts', () => {
      const summaryElements = fixture.nativeElement.querySelectorAll('.we-workflow-card__summary');
      expect(summaryElements[0].textContent).toContain('4 states · 3 transitions');
      expect(summaryElements[1].textContent).toContain('5 states · 6 transitions');
    });

    it('should emit workflowSelected when clicking a card', () => {
      const emitted: string[] = [];
      const sub = component.workflowSelected.subscribe((val) => emitted.push(val));
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');

      cards[0].click();
      expect(emitted).toEqual(['uuid-1']);

      cards[1].click();
      expect(emitted).toEqual(['uuid-1', 'uuid-2']);
      sub.unsubscribe();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      apiServiceSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
    });

    it('should show empty state message when no workflows', () => {
      const emptyEl = fixture.nativeElement.querySelector('.we-workflow-list__empty');
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.textContent).toContain('No workflows found. Create one via the API.');
    });

    it('should not show skeleton or cards when empty', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-list__skeleton');
      const cards = fixture.nativeElement.querySelector('.we-workflow-list__cards');
      expect(skeleton).toBeFalsy();
      expect(cards).toBeFalsy();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      apiServiceSpy.listWorkflows.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();
    });

    it('should show error message and retry button', () => {
      const errorEl = fixture.nativeElement.querySelector('.we-workflow-list__error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load workflows.');

      const retryBtn = errorEl.querySelector('.we-btn--retry');
      expect(retryBtn).toBeTruthy();
    });

    it('should set error signal and emit errorEvent', () => {
      expect(component.error()).toBe('Failed to load workflows.');
    });

    it('should hide skeleton and cards when in error state', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-list__skeleton');
      const cards = fixture.nativeElement.querySelector('.we-workflow-list__cards');
      expect(skeleton).toBeFalsy();
      expect(cards).toBeFalsy();
    });

    it('should retry loading when retry button is clicked', () => {
      // Reset spy to return data on second call
      apiServiceSpy.listWorkflows.and.returnValue(of(mockWorkflows));

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      retryBtn.click();
      fixture.detectChanges();

      // After retry, should show cards instead of error
      expect(component.error()).toBeNull();
      expect(component.loading()).toBeFalse();
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('title input', () => {
    it('should render title when provided', () => {
      apiServiceSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.componentRef.setInput('title', 'My Workflows');
      fixture.detectChanges();

      const titleEl = fixture.nativeElement.querySelector('.we-workflow-list__title');
      expect(titleEl).toBeTruthy();
      expect(titleEl.textContent).toContain('My Workflows');
    });

    it('should not render title when not provided', () => {
      apiServiceSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      const titleEl = fixture.nativeElement.querySelector('.we-workflow-list__title');
      expect(titleEl).toBeFalsy();
    });
  });

  describe('errorEvent output', () => {
    it('should emit errorEvent on API error', () => {
      apiServiceSpy.listWorkflows.and.returnValue(throwError(() => new Error('API error')));
      createComponent();

      // Subscribe BEFORE detectChanges so we catch the emission from ngOnInit
      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load workflows.']);
      sub.unsubscribe();
    });
  });
});
