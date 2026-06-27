import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';

/**
 * HTTP interceptor that attaches the API key to every outgoing request.
 * <p>
 * Reads the optional {@code apiKey} from the app configuration and, if set,
 * adds an {@code X-API-Key} header to every HTTP request.
 */
@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {

  private readonly config = inject(WORKFLOW_ENGINE_CONFIG);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.config.apiKey) {
      return next.handle(req);
    }

    const cloned = req.clone({
      setHeaders: { 'X-API-Key': this.config.apiKey },
    });

    return next.handle(cloned);
  }
}
