import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Modal/Dialog acessível (docs §5). Fecha com ESC ou clique no backdrop. */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (open()) {
      <div class="overlay" (click)="onBackdrop($event)">
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <header class="panel__head">
            <h3 class="panel__title">{{ title() }}</h3>
            <button type="button" class="panel__close" (click)="close.emit()" aria-label="Fechar">
              <app-icon name="x" [size]="20" />
            </button>
          </header>
          <div class="panel__body"><ng-content /></div>
          <footer class="panel__foot"><ng-content select="[slot=footer]" /></footer>
        </div>
      </div>
    }
  `,
  styleUrl: './modal.scss',
})
export class Modal {
  readonly open = input(false);
  readonly title = input('');
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.close.emit();
  }

  onBackdrop(_e: MouseEvent): void {
    this.close.emit();
  }
}
