import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorToastComponent } from './error-toast.component';
import { ErrorService } from './error.service';

describe('ErrorToastComponent', () => {
  let component: ErrorToastComponent;
  let fixture: ComponentFixture<ErrorToastComponent>;
  let errorService: ErrorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorToastComponent],
    }).compileComponents();

    errorService = TestBed.inject(ErrorService);
    fixture = TestBed.createComponent(ErrorToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render no toasts when there are no errors', () => {
    const toastElements = fixture.nativeElement.querySelectorAll('.shell-error-toast');
    expect(toastElements.length).toBe(0);
  });

  it('should render error toasts when errors exist', () => {
    errorService.addError('Test error 1');
    errorService.addError('Test error 2');
    fixture.detectChanges();

    const toastElements = fixture.nativeElement.querySelectorAll('.shell-error-toast');
    expect(toastElements.length).toBe(2);
    expect(toastElements[0].textContent).toContain('Test error 1');
    expect(toastElements[1].textContent).toContain('Test error 2');
  });

  it('should have role="alert" on each toast', () => {
    errorService.addError('Alert test');
    fixture.detectChanges();

    const toastEl = fixture.nativeElement.querySelector('.shell-error-toast');
    expect(toastEl.getAttribute('role')).toBe('alert');
  });

  describe('dismiss button', () => {
    it('should render a dismiss button on each toast', () => {
      errorService.addError('Dismiss me');
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('.shell-error-toast__dismiss');
      expect(dismissBtn).toBeTruthy();
      expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('should dismiss the error when dismiss button is clicked', () => {
      errorService.addError('Dismiss me');
      fixture.detectChanges();

      expect(errorService.errors().length).toBe(1);

      const dismissBtn = fixture.nativeElement.querySelector('.shell-error-toast__dismiss');
      dismissBtn.click();
      fixture.detectChanges();

      expect(errorService.errors().length).toBe(0);
    });

    it('should only dismiss the specific toast when multiple errors exist', () => {
      errorService.addError('Keep me');
      errorService.addError('Dismiss me');
      fixture.detectChanges();

      const dismissButtons = fixture.nativeElement.querySelectorAll('.shell-error-toast__dismiss');
      expect(dismissButtons.length).toBe(2);

      // Click the second dismiss button
      dismissButtons[1].click();
      fixture.detectChanges();

      const remaining = fixture.nativeElement.querySelectorAll('.shell-error-toast');
      expect(remaining.length).toBe(1);
      expect(remaining[0].textContent).toContain('Keep me');
    });
  });
});
