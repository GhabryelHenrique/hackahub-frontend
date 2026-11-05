import { Component, input, model } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

/** Segmented tabs; o conteúdo é trocado pelo pai via `@switch` no `active`. */
@Component({
  selector: 'app-tabs',
  template: `
    <div class="tabs" role="tablist">
      @for (t of tabs(); track t.id) {
        <button
          type="button"
          role="tab"
          class="tab"
          [class.is-active]="t.id === active()"
          [attr.aria-selected]="t.id === active()"
          (click)="active.set(t.id)"
        >
          {{ t.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `.tabs {
       display: inline-flex; gap: 4px; padding: 4px;
       background: var(--surface-inset); border-radius: var(--radius-full);
       border: 1px solid var(--border); overflow-x: auto; max-width: 100%;
     }
     .tab {
       border: 0; background: transparent; cursor: pointer;
       padding: 8px 16px; border-radius: var(--radius-full);
       font-size: var(--fs-sm); font-weight: 600; color: var(--text-muted);
       white-space: nowrap; transition: background 0.15s var(--ease), color 0.15s var(--ease);
     }
     .tab:hover { color: var(--text); }
     .tab.is-active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }`,
  ],
})
export class Tabs {
  readonly tabs = input.required<TabItem[]>();
  readonly active = model.required<string>();
}
