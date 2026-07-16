import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '../brand-logo/brand-logo';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrandLogo],
  template: `
    <footer class="footer">
      <div class="container footer__inner">
        <div class="footer__brand">
          <app-brand-logo [invert]="true" />
          <p class="footer__tagline">A plataforma para descobrir, participar e mentorar hackathons.</p>
        </div>
        <nav class="footer__cols" aria-label="Rodapé">
          <div class="footer__col">
            <h4>Plataforma</h4>
            <a routerLink="/">Eventos</a>
            <a routerLink="/app">Meus eventos</a>
            <!-- TODO: área do organizador (fora do MVP, docs §8) -->
            <a class="is-soon" aria-disabled="true">Para organizadores <span>em breve</span></a>
          </div>
          <div class="footer__col">
            <h4>Conta</h4>
            <a routerLink="/login">Entrar</a>
            <a routerLink="/cadastro">Criar conta</a>
          </div>
          <div class="footer__col">
            <h4>Recursos</h4>
            <!-- TODO: páginas institucionais (fora do MVP) -->
            <a class="is-soon" aria-disabled="true">Ajuda <span>em breve</span></a>
            <a class="is-soon" aria-disabled="true">Termos e privacidade <span>em breve</span></a>
          </div>
        </nav>
      </div>
      <div class="container footer__bar">
        <span>© 2026 Hackahub. Todos os direitos reservados.</span>
        <span class="footer__mvp">MVP</span>
      </div>
    </footer>
  `,
  styleUrl: './footer.scss',
})
export class Footer {}
