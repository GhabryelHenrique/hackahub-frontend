import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Política de Privacidade (público, SSR) — rota `/privacidade`.
 *
 * NOTA: minuta inicial de MVP alinhada à LGPD (Lei 13.709/2018). Deve ser
 * revisada por assessoria jurídica antes de produção. Data de vigência fixa
 * para manter o render SSR/zoneless determinístico.
 */
@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: '../legal.shared.scss',
})
export class Privacy {
  protected readonly updatedAt = '28 de julho de 2026';
}
