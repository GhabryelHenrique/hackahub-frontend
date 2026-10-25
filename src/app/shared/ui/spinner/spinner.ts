import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `<span
    class="spinner"
    role="status"
    aria-label="Carregando"
    [style.width.px]="size()"
    [style.height.px]="size()"
    [style.borderWidth.px]="Math.max(2, size() / 8)"
  ></span>`,
  styles: [
    `:host { display: inline-flex; }
     .spinner {
       display: inline-block;
       border-radius: 50%;
       border-style: solid;
       border-color: currentColor;
       border-right-color: transparent;
       animation: spin 0.7s linear infinite;
     }
     @keyframes spin { to { transform: rotate(360deg); } }`,
  ],
})
export class Spinner {
  readonly size = input(18);
  protected readonly Math = Math;
}
