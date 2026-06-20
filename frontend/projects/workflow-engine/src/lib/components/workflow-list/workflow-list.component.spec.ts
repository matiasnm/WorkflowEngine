import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowListComponent } from './workflow-list.component';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { WorkflowSummary } from '../../models';
import { FormsModule } from '@angular/forms';

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
      expect(component['workflows'].loading()).toBeTrue();
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
      expect(component['workflows'].loading()).toBeFalse();
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
      expect(component['workflows'].loading()).toBeFalse();
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
      expect(component['workflows'].error()).toBe('Failed to load workflows.');
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
      expect(component['workflows'].error()).toBeNull();
      expect(component['workflows'].loading()).toBeFalse();
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
      // Set up component with a successful first load
      apiServiceSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      // Subscribe to errorEvent after the component is created
      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiServiceSpy.listWorkflows.and.returnValue(throwError(() => new Error('API error')));
      component['workflows'].refresh();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load workflows.']);
      sub.unsubscribe();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  SEARCH / FILTER
  // ═══════════════════════════════════════════════════════════

  describe('search/filter', () => {
    beforeEach(() => {
      apiServiceSpy.listWorkflows.and.returnValue(of(mockWorkflows));
      createComponent();
      fixture.detectChanges();
    });

    it('should render search input in the component', () => {
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      expect(searchInput).toBeTruthy();
      expect(searchInput.getAttribute('type')).toBe('search');
      expect(searchInput.getAttribute('aria-label')).toBe('Search workflows');
      expect(searchInput.getAttribute('placeholder')).toBe('Search workflows...');
    });

    it('should show all workflows when search query is empty', () => {
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(2);
    });

    it('should filter workflows by name (case-insensitive)', () => {
      // Type a search query
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      searchInput.value = 'simple';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(1);
      expect(cards[0].textContent).toContain('simple-approval');
    });

    it('should show "No workflows match" message when no matches', () => {
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      searchInput.value = 'nonexistent';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(0);

      const emptyMsg = fixture.nativeElement.querySelector('.we-workflow-list__search-empty');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent).toContain("No workflows match 'nonexistent'");
    });

    it('should be case-insensitive (uppercase query matches lowercase name)', () => {
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      searchInput.value = 'SIMple';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(1);
      expect(cards[0].textContent).toContain('simple-approval');
    });

    it('should show all workflows when search is cleared', () => {
      // First, filter to one result
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      searchInput.value = 'simple';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-workflow-card').length).toBe(1);

      // Clear search
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(2);
    });

    it('should preserve search query state across loading transition', () => {
      // Set a search query first
      const searchInput = fixture.nativeElement.querySelector('.we-input--search');
      searchInput.value = 'simple';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.searchQuery()).toBe('simple');

      // Change spy to return a Subject for controlled timing
      const subject = new Subject<WorkflowSummary[]>();
      apiServiceSpy.listWorkflows.and.returnValue(subject.asObservable());

      // Trigger refresh — starts loading
      component['workflows'].refresh();
      fixture.detectChanges();

      // Loading state hides cards — shows skeleton
      expect(fixture.nativeElement.querySelector('.we-workflow-list__skeleton')).toBeTruthy();
      expect(component['workflows'].loading()).toBeTrue();

      // Complete loading with data
      subject.next(mockWorkflows);
      subject.complete();
      fixture.detectChanges();

      // Search query should still be 'simple'
      expect(component.searchQuery()).toBe('simple');
      // Filter should still apply
      const cards = fixture.nativeElement.querySelectorAll('.we-workflow-card');
      expect(cards.length).toBe(1);
      expect(cards[0].textContent).toContain('simple-approval');
    });
  });
});
