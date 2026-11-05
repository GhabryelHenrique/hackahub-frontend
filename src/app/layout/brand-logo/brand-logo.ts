import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Marca HackaHub: símbolo oficial (public/brand/logo-mark-64.png, gerado a partir de
 * public/logo_hackahub.png) + wordmark "Hacka" (claro) + "Hub" (roxo da marca).
 * `invert` é mantido por compatibilidade — no tema escuro a marca já é clara.
 */
@Component({
  selector: 'app-brand-logo',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="href()" [class.brand--invert]="invert()" aria-label="HackaHub — início">
      <img class="brand__mark" src="brand/logo-mark-64.png" width="34" height="34" alt="" aria-hidden="true" />
      <span class="brand__word">
        <span class="brand__hacka">Hacka</span><span class="brand__hub">Hub</span>
      </span>
    </a>
  `,
  styles: [
    `:host { display: inline-flex; }
     .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
     .brand:hover { text-decoration: none; }
     .brand__mark {
       border-radius: 9px;
       box-shadow: 0 0 0 1px var(--border), 0 4px 14px rgba(138, 63, 252, 0.25);
     }
     .brand__word { font-family: var(--font-display); font-weight: 700; font-size: 1.3rem; letter-spacing: -0.02em; line-height: 1; }
     .brand__hacka { color: var(--text); }
     .brand__hub { color: var(--accent); }
     .brand--invert .brand__hacka { color: #fff; }`,
  ],
})
export class BrandLogo {
  readonly href = input('/');
  readonly invert = input(false);
}
