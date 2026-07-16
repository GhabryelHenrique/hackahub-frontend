import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BrandLogo } from '../brand-logo/brand-logo';
import { Avatar, Button, Icon } from '../../shared/ui';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, BrandLogo, Avatar, Button, Icon],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly variant = input<'public' | 'app'>('public');
  protected readonly auth = inject(AuthService);

  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    this.userMenuOpen.set(false);
  }

  protected closeMenus(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenus();
    this.auth.logout();
  }
}
