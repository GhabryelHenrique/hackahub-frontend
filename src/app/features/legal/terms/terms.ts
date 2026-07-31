import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Termos de Serviço (público, SSR) — rota `/termos`.
 *
 * NOTA: conteúdo é uma minuta inicial para o MVP e deve ser revisado por
 * assessoria jurídica antes de produção. Data de vigência fixa (SSR/zoneless
 * não usa `new Date()` no template para manter render determinístico).
 */
@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './terms.html',
  styleUrl: '../legal.shared.scss',
})
export class Terms {
  protected readonly updatedAt = '28 de julho de 2026';
}
