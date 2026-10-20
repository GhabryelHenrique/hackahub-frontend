import { ChangeDetectionStrategy, Component, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { IMAGE_ACCEPT, IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, UploadService } from '../../../core/services/upload.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  ApiError,
  CreateHackathonPayload,
  HackathonStatus,
  HackathonVisibility,
  Organization,
  RegistrationMode,
} from '../../../core/models';
import { Avatar, Button, Card, FormField, Icon, Spinner } from '../../../shared/ui';
import { EVENT_STATUS_OPTIONS, REGISTRATION_OPTIONS, VISIBILITY_OPTIONS } from '../../../shared/labels';
import { localInputToIso, slugify } from '../../../shared/format';

/** Padrão de slug aceito pela API (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Fim não pode anteceder o início (strings YYYY-MM-DDTHH:mm comparam lexicograficamente). */
function dateOrderValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startsAt')?.value as string;
  const end = group.get('endsAt')?.value as string;
  return start && end && end < start ? { dateOrder: true } : null;
}

/**
 * Criação de evento (POST /organizations + POST /hackathons). Como a API só
 * expõe a criação de organização (sem listagem), o fluxo registra a organização
 * promotora e o evento sob ela numa única submissão; o autor vira ORGANIZER.
 */
@Component({
  selector: 'app-create-event',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Avatar, Button, Card, FormField, Icon, Spinner],
  templateUrl: './create-event.html',
  styleUrl: './create-event.scss',
})
export class CreateEvent {
  private readonly fb = inject(FormBuilder);
  private readonly orgs = inject(OrganizationService);
  private readonly hackathons = inject(HackathonService);
  private readonly uploads = inject(UploadService);
  private readonly users = inject(UserService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly REGISTRATION_OPTIONS = REGISTRATION_OPTIONS;
  protected readonly EVENT_STATUS_OPTIONS = EVENT_STATUS_OPTIONS;
  protected readonly VISIBILITY_OPTIONS = VISIBILITY_OPTIONS;

  protected readonly saving = signal(false);
  /** URL da capa do evento (enviada via /uploads). null = sem capa. */
  protected readonly IMAGE_ACCEPT = IMAGE_ACCEPT;
  protected readonly coverImageUrl = signal<string | null>(null);
  /** URL da foto de perfil do organizador; parte do valor atual e pode ser trocada. */
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly uploadingCover = signal(false);
  protected readonly uploadingAvatar = signal(false);
  /** Enquanto false, o slug acompanha o nome; passa a true quando o usuário edita. */
  protected readonly orgSlugLocked = signal(false);
  protected readonly slugLocked = signal(false);
  /** Erros inline de duplicidade (409) por campo. */
  protected readonly orgSlugError = signal('');
  protected readonly slugError = signal('');
  /**
   * Organização já criada nesta sessão de formulário. Se a criação do evento
   * falhar (ex.: slug do evento em uso), o retry reaproveita a organização em vez
   * de recriá-la — senão o POST /organizations retornaria 409 no próprio slug.
   */
  private readonly createdOrg = signal<{ id: string; slug: string } | null>(null);

  /** Organizações onde o usuário pode criar eventos (a API recusa as alheias com 403). */
  protected readonly myOrgs = signal<Organization[]>([]);
  protected readonly orgMode = signal<'existing' | 'new'>('new');

  protected readonly form = this.fb.nonNullable.group(
    {
      orgId: [''],
      orgName: ['', [Validators.required, Validators.maxLength(120)]],
      orgSlug: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(SLUG_PATTERN)]],
      name: ['', [Validators.required, Validators.maxLength(140)]],
      slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SLUG_PATTERN)]],
      description: [''],
      location: ['', Validators.maxLength(160)],
      startsAt: [''],
      endsAt: [''],
      registrationMode: ['OPEN' as RegistrationMode, Validators.required],
      registrationCode: [''],
      price: ['' as string | number],
      maxParticipants: ['' as string | number],
      maxMentors: ['' as string | number],
      teamMaxSize: [6, [Validators.required, Validators.min(1), Validators.max(50)]],
      status: ['DRAFT' as HackathonStatus, Validators.required],
      visibility: ['PUBLIC' as HackathonVisibility, Validators.required],
    },
    { validators: dateOrderValidator },
  );

  constructor() {
    // Parte da foto de perfil já existente — trocar é opcional.
    this.avatarUrl.set(this.auth.user()?.avatarUrl ?? null);

    // Quem já organiza algo começa reaproveitando a própria organização.
    this.orgs.mine().subscribe({
      next: (list) => {
        this.myOrgs.set(list);
        if (list.length) {
          this.form.controls.orgId.setValue(list[0].id);
          this.setOrgMode('existing');
        }
      },
      error: () => {},
    });

    // Slug acompanha o nome até o usuário editá-lo manualmente.
    this.form.controls.orgName.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      if (!this.orgSlugLocked()) {
        this.form.controls.orgSlug.setValue(slugify(v), { emitEvent: false });
      }
    });
    this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      if (!this.slugLocked()) {
        this.form.controls.slug.setValue(slugify(v), { emitEvent: false });
      }
    });
  }

  /** Alterna entre reaproveitar uma organização sua e criar uma nova (valida só os campos do modo). */
  protected setOrgMode(mode: 'existing' | 'new'): void {
    this.orgMode.set(mode);
    const { orgId, orgName, orgSlug } = this.form.controls;
    if (mode === 'existing') {
      orgId.setValidators(Validators.required);
      orgName.disable();
      orgSlug.disable();
    } else {
      orgId.clearValidators();
      orgName.enable();
      orgSlug.enable();
    }
    orgId.updateValueAndValidity();
  }

  /** Normaliza o slug digitado e passa a respeitar a edição manual. */
  protected onSlugInput(control: 'orgSlug' | 'slug'): void {
    (control === 'orgSlug' ? this.orgSlugLocked : this.slugLocked).set(true);
    const ctrl = this.form.controls[control];
    ctrl.setValue(slugify(ctrl.value), { emitEvent: false });
  }

  // ---- Imagens (capa do evento / foto do organizador) ----------------------

  protected onCoverSelected(event: Event): void {
    this.pickImage(event, this.uploadingCover, this.coverImageUrl);
  }

  protected onAvatarSelected(event: Event): void {
    this.pickImage(event, this.uploadingAvatar, this.avatarUrl);
  }

  protected removeCover(): void {
    this.coverImageUrl.set(null);
  }

  /** Valida no cliente, envia via /uploads e guarda a URL retornada. */
  private pickImage(
    event: Event,
    uploading: WritableSignal<boolean>,
    target: WritableSignal<string | null>,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite reenviar o mesmo arquivo depois
    if (!file) return;
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      this.toast.error('Use uma imagem PNG, JPG, WEBP ou GIF.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      this.toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }
    uploading.set(true);
    this.uploads.upload(file).subscribe({
      next: ({ url }) => {
        target.set(url);
        uploading.set(false);
      },
      error: () => uploading.set(false), // o interceptor de erro já notifica
    });
  }

  protected create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.orgSlugError.set('');
    this.slugError.set('');
    const v = this.form.getRawValue();
    // Modo CODE sem código = ninguém consegue entrar (a API também recusa).
    if (v.registrationMode === 'CODE' && !v.registrationCode.trim()) {
      this.form.controls.registrationCode.setErrors({ required: true });
      this.form.controls.registrationCode.markAsTouched();
      return;
    }

    this.saving.set(true);

    if (this.orgMode() === 'existing') {
      this.createHackathon(v.orgId);
      return;
    }

    // Reaproveita a organização criada numa tentativa anterior (mesmo slug).
    const existing = this.createdOrg();
    if (existing && existing.slug === v.orgSlug) {
      this.createHackathon(existing.id);
      return;
    }

    this.orgs.create({ name: v.orgName.trim(), slug: v.orgSlug }).subscribe({
      next: (org) => {
        this.createdOrg.set({ id: org.id, slug: org.slug });
        this.createHackathon(org.id);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        if (err.statusCode === 409) {
          const mine = this.myOrgs().some((o) => o.slug === v.orgSlug);
          this.orgSlugError.set(
            mine
              ? 'Esta organização já é sua — escolha “Usar uma organização sua”.'
              : 'Já existe uma organização com este identificador.',
          );
          this.form.controls.orgSlug.setErrors({ taken: true });
        }
      },
    });
  }

  /** Segunda etapa: cria o evento sob a organização recém-criada. */
  private createHackathon(organizationId: string): void {
    const v = this.form.getRawValue();
    const payload: CreateHackathonPayload = {
      organizationId,
      name: v.name.trim(),
      slug: v.slug,
      registrationMode: v.registrationMode,
      teamMaxSize: v.teamMaxSize,
      status: v.status,
      visibility: v.visibility,
      startsAt: localInputToIso(v.startsAt),
      endsAt: localInputToIso(v.endsAt),
      maxParticipants: this.toIntOrNull(v.maxParticipants),
      maxMentors: this.toIntOrNull(v.maxMentors),
      price: this.toPriceOrNull(v.price),
    };
    const description = v.description.trim();
    if (description) payload.description = description;
    const location = v.location.trim();
    payload.location = location || null;
    if (v.registrationMode === 'CODE' && v.registrationCode.trim()) {
      payload.registrationCode = v.registrationCode.trim();
    }
    const cover = this.coverImageUrl();
    if (cover) payload.coverImage = cover;

    this.hackathons.create(payload).subscribe({
      next: (h) => this.afterCreated(h.id),
      error: (err: ApiError) => {
        this.saving.set(false);
        if (err.statusCode === 409) {
          this.slugError.set('Já existe um evento com este identificador. Escolha outro.');
          this.form.controls.slug.setErrors({ taken: true });
        }
      },
    });
  }

  /**
   * Pós-criação: persiste a foto de perfil (se trocada) e só então recarrega a
   * sessão e navega — a área de gestão exige a membership de ORGANIZER carregada.
   * Falha ao salvar o avatar não bloqueia o fluxo do evento.
   */
  private afterCreated(hackathonId: string): void {
    const finish = () =>
      this.auth.reload().subscribe({
        next: () => this.goToManage(hackathonId),
        error: () => this.goToManage(hackathonId),
      });

    const avatar = this.avatarUrl();
    if (avatar && avatar !== (this.auth.user()?.avatarUrl ?? null)) {
      this.users.updateProfile({ avatarUrl: avatar }).subscribe({ next: finish, error: finish });
    } else {
      finish();
    }
  }

  private goToManage(hackathonId: string): void {
    this.saving.set(false);
    this.toast.success('Evento criado! Agora ajuste os detalhes e publique quando quiser.');
    this.router.navigate(['/app/eventos', hackathonId, 'gerenciar']);
  }

  /** '' → null (sem limite); aceita string do input number. */
  private toIntOrNull(value: string | number): number | null {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  /** '' → null (gratuito); arredonda a 2 casas (contrato maxDecimalPlaces). */
  private toPriceOrNull(value: string | number): number | null {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
}
