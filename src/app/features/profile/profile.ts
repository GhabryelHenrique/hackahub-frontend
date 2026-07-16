import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/toast/toast.service';
import { Avatar, Button, Card, FormField, Icon } from '../../shared/ui';
import { fullDate } from '../../shared/format';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Avatar, Button, Card, FormField, Icon],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly fullDate = fullDate;
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: [''],
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
        phone: u.phone ?? '',
        institution: u.institution ?? '',
        course: u.course ?? '',
        githubUrl: u.githubUrl ?? '',
        linkedinUrl: u.linkedinUrl ?? '',
      });
    }
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
}
