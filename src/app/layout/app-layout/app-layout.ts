import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';

/** Shell autenticado (docs §2.2 / §3.2). */
@Component({
  selector: 'app-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar],
  template: `
    <app-navbar variant="app" />
    <main id="main" class="app-main"><router-outlet /></main>
  `,
  styles: [
    `:host { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface-muted); }
     .app-main { flex: 1; padding-block: var(--sp-8) var(--sp-16); }`,
  ],
})
export class AppLayout {}
