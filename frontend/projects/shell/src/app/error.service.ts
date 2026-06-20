import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

export interface AppError {
  id: string;
  message: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly errors = signal<AppError[]>([]);

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(router: Router) {
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.clearAll();
    });
  }

  addError(message: string): void {
    const existing = this.errors().find(e => e.message === message);
    if (existing) {
      // Reset the dismiss timer for the existing toast instead of stacking
      clearTimeout(this.timers.get(existing.id));
      this.timers.set(existing.id, setTimeout(() => this.dismissError(existing.id), 8000));
      return;
    }
    const id = crypto.randomUUID();
    this.errors.update(errors => [...errors, { id, message, timestamp: new Date() }]);
    this.timers.set(id, setTimeout(() => this.dismissError(id), 8000));
  }

  dismissError(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }

  private clearAll(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
    this.errors.set([]);
  }
}
