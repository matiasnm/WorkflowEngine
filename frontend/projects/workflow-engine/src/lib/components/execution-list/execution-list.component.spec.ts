import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionListComponent } from './execution-list.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { StateColorService } from '../../services/state-color.service';
import { ExecutionResponse, Page } from '../../models';

describe('ExecutionListComponent', () => {
  let component: ExecutionListComponent;
  let fixture: ComponentFixture<ExecutionListComponent>;
  let apiServiceSpy: jasmine.SpyObj<ExecutionApiPort>;
  let stateColorSpy: jasmine.SpyObj<StateColorService>;

  const mockExecutions: ExecutionResponse[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workflowId: 'wf-uuid-1',
      currentState: { code: 'in_review', name: 'IN REVIEW', terminal: false },
      currentStateSince: '2026-06-19T10:05:00Z',
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      workflowId: 'wf-uuid-1',
      currentState: { code: 'created', name: 'CREATED', terminal: false },
      currentStateSince: '2026-06-19T10:00:00Z',
    },
  ];

  const defaultPage: Page<ExecutionResponse> = {
    content: mockExecutions,
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
  };

  const multiPage: Page<ExecutionResponse> = {
    content: mockExecutions.slice(0, 1),
    page: 0,
    size: 1,
    totalElements: 2,
    totalPages: 2,
  };

  const pageTwo: Page<ExecutionResponse> = {
    content: mockExecutions.slice(1, 2),
    page: 1,
    size: 1,
    totalElements: 2,
    totalPages: 2,
  };

  beforeEach(async () => {
    localStorage.clear();
    const spy = jasmine.createSpyObj('ExecutionApiPort', [
      'listExecutions', 'deleteExecution',
    ]);

    stateColorSpy = jasmine.createSpyObj('StateColorService', ['getColor', 'getOrCreateColors']);
    stateColorSpy.getColor.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [ExecutionListComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: spy },
        { provide: StateColorService, useValue: stateColorSpy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  function createComponent(workflowId = 'wf-uuid-1'): void {
    fixture = TestBed.createComponent(ExecutionListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workflowId', workflowId);
  }

  describe('loading state', () => {
    it('should show skeleton shimmer on mount while data is loading', fakeAsync(() => {
      const subject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();
      // Effects run after change detection
      tick();
      fixture.detectChanges();

      // Should show skeleton while loading
      expect(component['loading']()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      expect(skeleton).toBeTruthy();
      expect(skeleton.children.length).toBe(3);

      // Data arrives
      subject.next(defaultPage);
      subject.complete();
      fixture.detectChanges();

      expect(component['loading']()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      expect(skeletonAfter).toBeFalsy();
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    }));

    it('should set loading to false when API call fails', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component['loading']()).toBeFalse();
    }));
  });

  describe('success state', () => {
    beforeEach(fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(defaultPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should render execution rows for each execution', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    });

    it('should display truncated execution ID', () => {
      const codeElements = fixture.nativeElement.querySelectorAll('.we-execution-row code');
      expect(codeElements[0].textContent).toContain('550e…');
      expect(codeElements[1].textContent).toContain('660e…');
    });

    it('should display state name and code', () => {
      const stateElements = fixture.nativeElement.querySelectorAll('.we-execution-state');
      expect(stateElements[0].textContent).toContain('IN REVIEW');
      const codeElements = fixture.nativeElement.querySelectorAll('.we-execution-state-code');
      expect(codeElements[0].textContent).toContain('(in_review)');
    });

    it('should emit executionSelected when clicking a row', () => {
      const emitted: string[] = [];
      const sub = component.executionSelected.subscribe((val) => emitted.push(val));
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');

      rows[0].click();
      expect(emitted).toEqual(['550e8400-e29b-41d4-a716-446655440000']);

      rows[1].click();
      expect(emitted).toEqual([
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
      ]);
      sub.unsubscribe();
    });
  });

  describe('empty state', () => {
    const emptyPage: Page<ExecutionResponse> = {
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
    };

    beforeEach(fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(emptyPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should show empty state message when no executions', () => {
      const emptyEl = fixture.nativeElement.querySelector('.we-execution-list__empty');
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.textContent).toContain('No executions yet. Start one above.');
    });

    it('should not show skeleton or table when empty', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      const table = fixture.nativeElement.querySelector('.we-execution-list__table');
      expect(skeleton).toBeFalsy();
      expect(table).toBeFalsy();
    });
  });

  describe('error state', () => {
    beforeEach(fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should show error message without retry button', () => {
      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load executions.');

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeFalsy();
    });

    it('should set error signal', () => {
      expect(component['error']()).toBe('Failed to load executions.');
    });

    it('should hide skeleton and table when in error state', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      const table = fixture.nativeElement.querySelector('.we-execution-list__table');
      expect(skeleton).toBeFalsy();
      expect(table).toBeFalsy();
    });
  });

  describe('errorEvent output', () => {
    it('should emit errorEvent on API error', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(defaultPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('API error')));
      component.refresh();
      tick();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load executions.']);
      sub.unsubscribe();
    }));
  });

  describe('state colour swatches', () => {
    const colorMap: Record<string, string> = {
      in_review: 'rgb(92, 107, 192)',
      created:   'rgb(76, 175, 80)',
    };

    beforeEach(fakeAsync(() => {
      stateColorSpy.getColor.and.callFake(
        (_wfId: string, code: string): string | null => colorMap[code] ?? null,
      );
      apiServiceSpy.listExecutions.and.returnValue(of(defaultPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('renders a swatch span in each state cell', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      expect(swatches.length).toBe(2);
    });

    it('sets background-color on each swatch from the service', () => {
      const swatches = fixture.nativeElement.querySelectorAll(
        '.we-state-swatch',
      ) as NodeListOf<HTMLElement>;
      expect(swatches[0].style.backgroundColor).toBe(colorMap['in_review']);
      expect(swatches[1].style.backgroundColor).toBe(colorMap['created']);
    });

    it('passes the component workflowId to the service', () => {
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-uuid-1', 'in_review');
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-uuid-1', 'created');
    });

    it('swatch has no background when service returns null', () => {
      stateColorSpy.getColor.and.returnValue(null);
      fixture.detectChanges();
      const swatches = fixture.nativeElement.querySelectorAll(
        '.we-state-swatch',
      ) as NodeListOf<HTMLElement>;
      swatches.forEach(s => expect(s.style.backgroundColor).toBe(''));
    });

    it('clicking a row still emits executionSelected (swatch is not interactive)', () => {
      const emitted: string[] = [];
      const sub = component.executionSelected.subscribe(v => emitted.push(v));
      (fixture.nativeElement.querySelector('.we-execution-row') as HTMLElement).click();
      expect(emitted).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
      sub.unsubscribe();
    });

    it('no swatches rendered during loading', fakeAsync(() => {
      const subject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
      subject.complete();
    }));

    it('no swatches rendered in error state', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    }));

    it('no swatches rendered for empty list', fakeAsync(() => {
      const emptyPage: Page<ExecutionResponse> = {
        content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
      };
      apiServiceSpy.listExecutions.and.returnValue(of(emptyPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    }));
  });

  // ── Pagination ───────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('should hide pagination controls when totalPages <= 1', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(defaultPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const pagination = fixture.nativeElement.querySelector('.we-pagination');
      expect(pagination).toBeFalsy();
    }));

    it('should show pagination controls when totalPages > 1', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const pagination = fixture.nativeElement.querySelector('.we-pagination');
      expect(pagination).toBeTruthy();
      expect(pagination.textContent).toContain('Page 1 of 2');
    }));

    it('should disable Previous button on first page', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const prevBtn = fixture.nativeElement.querySelector('.we-pagination__btn--prev') as HTMLButtonElement;
      expect(prevBtn.disabled).toBeTrue();
    }));

    it('should disable Next button on last page', fakeAsync(() => {
      // Return pageTwo on both calls (first call for init, which will get pageTwo...)
      // Actually we need to simulate: first call returns multiPage (page 0), then
      // next click triggers pageTwo (page 1, last page)
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Now on page 0 of 2 — Next should be enabled
      const nextBtn = fixture.nativeElement.querySelector('.we-pagination__btn--next') as HTMLButtonElement;
      expect(nextBtn.disabled).toBeFalse();

      // Set up next response and click Next
      apiServiceSpy.listExecutions.and.returnValue(of(pageTwo));
      component['goToNextPage']();
      tick();
      fixture.detectChanges();

      // Now on page 1 of 3 (last page) — Next should be disabled
      expect(nextBtn.disabled).toBeTrue();
      // Previous should be enabled now
      const prevBtn = fixture.nativeElement.querySelector('.we-pagination__btn--prev') as HTMLButtonElement;
      expect(prevBtn.disabled).toBeFalse();
    }));

    it('should fetch next page when clicking Next', fakeAsync(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Verify page 0 loaded
      expect(component['currentPage']()).toBe(0);
      let rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(1);

      // Click Next
      apiServiceSpy.listExecutions.and.returnValue(of(pageTwo));
      component['goToNextPage']();
      tick();
      fixture.detectChanges();

      // Verify page 1 loaded
      expect(component['currentPage']()).toBe(1);
      rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(1);
    }));

    it('should fetch previous page when clicking Previous', fakeAsync(() => {
      // First call returns multiPage
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Navigate to page 1
      apiServiceSpy.listExecutions.and.returnValue(of(pageTwo));
      component['goToNextPage']();
      tick();
      fixture.detectChanges();
      expect(component['currentPage']()).toBe(1);

      // Click Previous — return multiPage again
      apiServiceSpy.listExecutions.and.returnValue(of(multiPage));
      component['goToPreviousPage']();
      tick();
      fixture.detectChanges();

      expect(component['currentPage']()).toBe(0);
    }));

    it('should show spinner during page navigation', fakeAsync(() => {
      const subject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();
      // First emission to load initial data
      subject.next(multiPage);
      tick();
      fixture.detectChanges();

      // Now navigate — set up a new subject that doesn't complete immediately
      const navSubject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(navSubject.asObservable());
      component['goToNextPage']();
      tick();
      fixture.detectChanges();

      // Should show spinner during page nav
      const spinner = fixture.nativeElement.querySelector('we-spinner');
      expect(spinner).toBeTruthy();
      expect(component['pageLoading']()).toBeTrue();

      // Complete the navigation
      navSubject.next(pageTwo);
      navSubject.complete();
      tick();
      fixture.detectChanges();

      expect(component['pageLoading']()).toBeFalse();
      const spinnerAfter = fixture.nativeElement.querySelector('we-spinner');
      expect(spinnerAfter).toBeFalsy();
    }));

    it('should apply opacity overlay to table during page navigation', fakeAsync(() => {
      const subject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();
      subject.next(multiPage);
      tick();
      fixture.detectChanges();

      const tableWrapper = fixture.nativeElement.querySelector('.we-execution-list__table-wrapper');
      expect(tableWrapper.classList.contains('we-execution-list__table-wrapper--loading')).toBeFalse();

      // Navigate
      const navSubject = new Subject<Page<ExecutionResponse>>();
      apiServiceSpy.listExecutions.and.returnValue(navSubject.asObservable());
      component['goToNextPage']();
      tick();
      fixture.detectChanges();

      expect(tableWrapper.classList.contains('we-execution-list__table-wrapper--loading')).toBeTrue();
    }));
  });
});
