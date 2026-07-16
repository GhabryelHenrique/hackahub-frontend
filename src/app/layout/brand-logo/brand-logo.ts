import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Marca Hackahub: símbolo com gradiente + wordmark "Hacka"(navy) + "hub"(laranja). */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="href()" [class.brand--invert]="invert()" aria-label="Hackahub — início">
      <span class="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="32" height="32">
          <defs>
            <linearGradient id="hh-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#3FA9E0" />
              <stop offset="0.45" stop-color="#2E90D8" />
              <stop offset="1" stop-color="#F5811E" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#hh-grad)" />
          <path
            d="M11 9v14M21 9v14M11 16h10"
            stroke="#fff"
            stroke-width="2.6"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span class="brand__word">
        <span class="brand__hacka">Hacka</span><span class="brand__hub">hub</span>
      </span>
    </a>
  `,
  styles: [
    `:host { display: inline-flex; }
     .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
     .brand:hover { text-decoration: none; }
     .brand__mark { display: inline-flex; box-shadow: var(--shadow-sm); border-radius: 9px; }
     .brand__word { font-family: var(--font-display); font-weight: 700; font-size: 1.3rem; letter-spacing: -0.02em; line-height: 1; }
     .brand__hacka { color: var(--brand-navy); }
     .brand__hub { color: var(--brand-orange); }
     .brand--invert .brand__hacka { color: #fff; }`,
  ],
})
export class BrandLogo {
  readonly href = input('/');
  readonly invert = input(false);
}
