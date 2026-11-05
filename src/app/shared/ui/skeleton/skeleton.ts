import { Component, input } from '@angular/core';

/** Placeholder com shimmer para evitar layout shift (docs §4.1 / §7). */
@Component({
  selector: 'app-skeleton',
  template: ``,
  host: {
    class: 'skeleton',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.borderRadius]': 'radius()',
  },
  styles: [
    `.skeleton {
       display: block;
       background: linear-gradient(90deg, var(--surface-inset) 25%, var(--border-strong) 37%, var(--surface-inset) 63%);
       background-size: 400% 100%;
       animation: shimmer 1.4s ease infinite;
     }
     @keyframes shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }`,
  ],
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('var(--radius-sm)');
}
