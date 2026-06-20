import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ErrorToastComponent } from './error-toast.component';

@Component({
  selector: 'shell-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ErrorToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
