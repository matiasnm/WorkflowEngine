import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ErrorService } from './error.service';

describe('ErrorService', () => {
  let service: ErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addError', () => {
    it('should add an error with an id and timestamp', () => {
      service.addError('Something went wrong');

      const errors = service.errors();
      expect(errors.length).toBe(1);
      expect(errors[0].id).toBeTruthy();
      expect(errors[0].message).toBe('Something went wrong');
      expect(errors[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add multiple errors stacked', () => {
      service.addError('Error 1');
      service.addError('Error 2');
      service.addError('Error 3');

      expect(service.errors().length).toBe(3);
      expect(service.errors()[0].message).toBe('Error 1');
      expect(service.errors()[2].message).toBe('Error 3');
    });
  });

  describe('dismissError', () => {
    it('should remove an error by id', () => {
      service.addError('Error 1');
      service.addError('Error 2');

      const idToRemove = service.errors()[0].id;
      service.dismissError(idToRemove);

      const remaining = service.errors();
      expect(remaining.length).toBe(1);
      expect(remaining[0].message).toBe('Error 2');
    });

    it('should do nothing if id does not match any error', () => {
      service.addError('Error 1');
      service.dismissError('non-existent-id');

      expect(service.errors().length).toBe(1);
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss error after 8 seconds', fakeAsync(() => {
      service.addError('Auto-dismiss me');
      expect(service.errors().length).toBe(1);

      tick(7999);
      expect(service.errors().length).toBe(1);

      tick(1); // 8000ms total
      expect(service.errors().length).toBe(0);
    }));

    it('should auto-dismiss only the specific error that timed out', fakeAsync(() => {
      service.addError('Error A');
      service.addError('Error B');

      tick(4000);
      service.addError('Error C');
      expect(service.errors().length).toBe(3);

      tick(4000);
      // Error A and Error B should be dismissed (8s elapsed)
      expect(service.errors().length).toBe(1);
      expect(service.errors()[0].message).toBe('Error C');
    }));
  });
});
