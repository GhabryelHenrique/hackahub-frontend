import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { HackathonService } from '../services/hackathon.service';
import { CatalogService } from '../services/catalog.service';
import { Hackathon, HackathonDetail, HackathonSummary, MyMembership } from '../models';

/**
 * Contexto do evento ativo (docs §2.4). Resolve o `hackathonId` da rota e o
 * papel do usuário NAQUELE evento — do qual guards e menus derivam.
 *
 * Fontes de dado (por nível de acesso):
 * - `summary`: embutido nas memberships globais (instantâneo, qualquer status).
 * - `detail`: `GET /catalog/:slug` (público) — descrição completa + desafios.
 * - `full`: `GET /hackathons/:id` (só membros aprovados) — traz `teamMaxSize`.
 */
@Injectable({ providedIn: 'root' })
export class EventContextService {
  private readonly hackathons = inject(HackathonService);
  private readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);

  readonly activeId = signal<string | null>(null);
  readonly summary = signal<HackathonSummary | null>(null);
  readonly detail = signal<HackathonDetail | null>(null);
  readonly full = signal<Hackathon | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly memberships = computed<MyMembership[]>(() => {
    const id = this.activeId();
    return id ? this.auth.membershipsFor(id) : [];
  });
  readonly participant = computed(() => this.memberships().find((m) => m.role === 'PARTICIPANT'));
  readonly mentor = computed(() => this.memberships().find((m) => m.role === 'MENTOR'));
  readonly organizer = computed(() => this.memberships().find((m) => m.role === 'ORGANIZER'));
  readonly isParticipantApproved = computed(() => this.participant()?.status === 'APPROVED');
  readonly isMentorApproved = computed(() => this.mentor()?.status === 'APPROVED');
  readonly isOrganizerApproved = computed(() => this.organizer()?.status === 'APPROVED');
  readonly teamMaxSize = computed(() => this.full()?.teamMaxSize ?? null);

  setActive(hackathonId: string): void {
    if (this.activeId() === hackathonId && this.detail()) return;
    this.activeId.set(hackathonId);
    this.error.set(null);
    this.detail.set(null);
    this.full.set(null);

    const summary = this.auth.membershipsFor(hackathonId)[0]?.hackathon ?? null;
    this.summary.set(summary);

    // Detalhe público (descrição + desafios). `silent`: evento DRAFT/PRIVATE
    // retorna 404 esperado aqui — sem toast global.
    if (summary?.slug) {
      this.loading.set(true);
      this.catalog.getBySlug(summary.slug, { silent: true }).subscribe({
        next: (d) => {
          this.detail.set(d);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }

    // Detalhe autenticado (teamMaxSize etc.) quando o usuário é membro aprovado.
    if (this.isParticipantApproved() || this.isMentorApproved() || this.isOrganizerApproved()) {
      this.hackathons.detail(hackathonId).subscribe({
        next: (f) => this.full.set(f),
        error: () => {},
      });
    }
  }

  /** Reflete um PATCH do organizador nos signals sem refetch. */
  applyFull(h: Hackathon): void {
    this.full.set(h);
    this.summary.update((s) =>
      s && s.id === h.id
        ? {
            ...s,
            name: h.name,
            registrationMode: h.registrationMode,
            coverImage: h.coverImage,
            startsAt: h.startsAt,
            endsAt: h.endsAt,
            location: h.location,
            price: h.price,
          }
        : s,
    );
    this.detail.update((d) =>
      d && d.id === h.id
        ? {
            ...d,
            name: h.name,
            description: h.description,
            registrationMode: h.registrationMode,
            startsAt: h.startsAt,
            endsAt: h.endsAt,
            location: h.location,
            price: h.price,
          }
        : d,
    );
  }

  clear(): void {
    this.activeId.set(null);
    this.summary.set(null);
    this.detail.set(null);
    this.full.set(null);
  }
}
