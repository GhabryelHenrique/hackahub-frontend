import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

/** Shell público (docs §2.2) — catálogo, detalhe de evento, auth. */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    <app-navbar variant="public" />
    <main id="main"><router-outlet /></main>
    <app-footer />
  `,
  styles: [`:host { display: flex; flex-direction: column; min-height: 100dvh; } main { flex: 1; }`],
})
export class PublicLayout {}
