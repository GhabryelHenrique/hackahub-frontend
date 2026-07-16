import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Avatar com iniciais e cor derivada (docs §5). */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="avatar"
    [style.width.px]="size()"
    [style.height.px]="size()"
    [style.background]="bg()"
    [style.fontSize.px]="size() * 0.4"
    [attr.title]="name()"
    aria-hidden="true"
  >{{ initials() }}</span>`,
  styles: [
    `:host { display: inline-flex; }
     .avatar {
       display: inline-flex; align-items: center; justify-content: center;
       border-radius: 50%; color: #fff; font-weight: 600;
       font-family: var(--font-display); letter-spacing: 0.02em;
       flex: none; user-select: none;
     }`,
  ],
})
export class Avatar {
  readonly name = input('');
  readonly color = input<string | undefined>(undefined);
  readonly size = input(40);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  protected readonly bg = computed(() => {
    const c = this.color();
    if (c) return c;
    // Cor determinística a partir do nome.
    let hash = 0;
    for (const ch of this.name()) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 55% 45%)`;
  });
}
