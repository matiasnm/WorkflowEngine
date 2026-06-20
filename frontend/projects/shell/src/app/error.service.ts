import { Injectable, signal } from '@angular/core';

export interface AppError {
  id: string;
  message: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly errors = signal<AppError[]>([]);

  addError(message: string): void {
    const id = crypto.randomUUID();
    this.errors.update(errors => [...errors, { id, message, timestamp: new Date() }]);
    // Auto-dismiss after 8 seconds
    setTimeout(() => this.dismissError(id), 8000);
  }

  dismissError(id: string): void {
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }
}
