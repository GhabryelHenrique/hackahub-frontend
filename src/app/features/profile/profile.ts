import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import {
  DiscordLinkCode,
  DiscordLinkStatus,
  DiscordService,
} from '../../core/services/discord.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/toast/toast.service';
import { Avatar, Badge, Button, Card, FormField, Icon, InputMask } from '../../shared/ui';
import { digitsOnly, formatCpf, fullDate } from '../../shared/format';
import { phoneValidator } from '../../shared/validators';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, Avatar, Badge, Button, Card, FormField, Icon, InputMask],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly fullDate = fullDate;
  protected readonly formatCpf = formatCpf;
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    // Obrigatório na API (não aceita vazio); só dígitos — appMask formata a exibição.
    phone: ['', [Validators.required, phoneValidator]],
    institution: [''],
    course: [''],
    githubUrl: [''],
    linkedinUrl: [''],
  });

  constructor() {
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({
        name: u.name,
        phone: digitsOnly(u.phone),
        institution: u.institution ?? '',
        course: u.course ?? '',
        githubUrl: u.githubUrl ?? '',
        linkedinUrl: u.linkedinUrl ?? '',
      });
    }
    this.loadDiscord();
  }

  protected phoneError(): string {
    const c = this.form.controls.phone;
    if (!c.touched || c.valid) return '';
    return c.errors?.['required'] ? 'Informe seu telefone.' : 'Telefone inválido — informe DDD + número.';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.users.updateProfile(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.auth.applyUser(user);
        this.toast.success('Perfil atualizado.');
      },
      error: () => this.saving.set(false),
    });
  }

  // ---- Integração Discord ---------------------------------------------------

  private readonly discord = inject(DiscordService);
  protected readonly discordLink = signal<DiscordLinkStatus | null>(null);
  protected readonly linkCode = signal<DiscordLinkCode | null>(null);
  protected readonly discordBusy = signal(false);

  private loadDiscord(): void {
    this.discord.getLink().subscribe({
      next: (status) => this.discordLink.set(status),
      error: () => {},
    });
  }

  protected generateCode(): void {
    this.discordBusy.set(true);
    this.discord.generateCode().subscribe({
      next: (code) => {
        this.linkCode.set(code);
        this.discordBusy.set(false);
      },
      error: () => this.discordBusy.set(false),
    });
  }

  protected unlinkDiscord(): void {
    this.discordBusy.set(true);
    this.discord.unlink().subscribe({
      next: () => {
        this.discordBusy.set(false);
        this.discordLink.set({ linked: false, discordUsername: null });
        this.linkCode.set(null);
        this.toast.success('Conta do Discord desvinculada.');
      },
      error: () => this.discordBusy.set(false),
    });
  }

  protected copyCode(): void {
    const code = this.linkCode()?.code;
    if (code && typeof navigator !== 'undefined') {
      void navigator.clipboard?.writeText(`/vincular codigo:${code}`);
      this.toast.success('Comando copiado.');
    }
  }
}
