import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHost } from './shared/ui/toast/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost],
  template: `
    <a class="skip-link" href="#main">Pular para o conteúdo</a>
    <router-outlet />
    <app-toast-host />
  `,
})
export class App {}
