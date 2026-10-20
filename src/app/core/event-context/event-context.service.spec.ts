import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EventContextService } from './event-context.service';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../services/catalog.service';
import { HackathonService } from '../services/hackathon.service';
import {
  Hackathon,
  HackathonDetail,
  HackathonSummary,
  Membership,
  MembershipRole,
  MembershipStatus,
  MyMembership,
} from '../models';

const summary: HackathonSummary = {
  id: 'h1',
  name: 'Hack Cidades',
  slug: 'hack-cidades',
  description: 'Resumo',
  organization: { name: 'Org', slug: 'org' },
  registrationMode: 'APPROVAL',
  coverImage: null,
  startsAt: '2026-11-01T12:00:00Z',
  endsAt: '2026-11-03T12:00:00Z',
  location: 'São Paulo',
  price: null,
  participantsCount: 10,
};

const detail: HackathonDetail = { ...summary, description: 'Descrição completa', challenges: [] };

const full: Hackathon = {
  id: 'h1',
  organizationId: 'o1',
  name: 'Hack Cidades',
  slug: 'hack-cidades',
  description: 'Descrição completa',
  visibility: 'PUBLIC',
  status: 'PUBLISHED',
  registrationMode: 'APPROVAL',
  coverImage: null,
  startsAt: summary.startsAt,
  endsAt: summary.endsAt,
  teamMaxSize: 5,
  maxParticipants: 100,
  maxMentors: 10,
  location: 'São Paulo',
  price: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function mem(role: MembershipRole, status: MembershipStatus, hackathonId = 'h1'): MyMembership {
  return {
    id: `${hackathonId}-${role}`,
    hackathonId,
    role,
    status,
    createdAt: '2026-01-01T00:00:00Z',
    hackathon: { ...summary, id: hackathonId },
  };
}

describe('EventContextService', () => {
  let ctx: EventContextService;
  let auth: AuthService;
  const hackathons = { detail: vi.fn(), memberships: vi.fn() };
  const catalog = { getBySlug: vi.fn() };

  beforeEach(() => {
    hackathons.detail.mockReset().mockReturnValue(of(full));
    hackathons.memberships.mockReset().mockReturnValue(of([{ id: 'p1' }, { id: 'p2' }] as Membership[]));
    catalog.getBySlug.mockReset().mockReturnValue(of(detail));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HackathonService, useValue: hackathons },
        { provide: CatalogService, useValue: catalog },
      ],
    });
    ctx = TestBed.inject(EventContextService);
    auth = TestBed.inject(AuthService);
  });

  describe('papéis no evento ativo', () => {
    it('sem evento ativo não há memberships', () => {
      auth.memberships.set([mem('PARTICIPANT', 'APPROVED')]);
      expect(ctx.memberships()).toEqual([]);
      expect(ctx.isParticipantApproved()).toBe(false);
    });

    it('deriva cada papel e o status aprovado apenas do evento ativo', () => {
      auth.memberships.set([
        mem('PARTICIPANT', 'APPROVED', 'h1'),
        mem('MENTOR', 'PENDING', 'h1'),
        mem('ORGANIZER', 'APPROVED', 'h2'),
      ]);
      ctx.activeId.set('h1');

      expect(ctx.memberships().length).toBe(2);
      expect(ctx.participant()?.status).toBe('APPROVED');
      expect(ctx.mentor()?.status).toBe('PENDING');
      expect(ctx.organizer()).toBeUndefined();
      expect(ctx.isParticipantApproved()).toBe(true);
      expect(ctx.isMentorApproved()).toBe(false);
      expect(ctx.isOrganizerApproved()).toBe(false);

      ctx.activeId.set('h2');
      expect(ctx.isOrganizerApproved()).toBe(true);
      expect(ctx.isParticipantApproved()).toBe(false);
    });

    it('teamMaxSize vem do detalhe autenticado', () => {
      expect(ctx.teamMaxSize()).toBeNull();
      ctx.full.set(full);
      expect(ctx.teamMaxSize()).toBe(5);
    });
  });

  describe('setActive', () => {
    it('usa o resumo da membership e carrega o detalhe público em modo silencioso', () => {
      auth.memberships.set([mem('PARTICIPANT', 'PENDING')]);
      ctx.setActive('h1');

      expect(ctx.activeId()).toBe('h1');
      expect(ctx.summary()?.slug).toBe('hack-cidades');
      expect(catalog.getBySlug).toHaveBeenCalledWith('hack-cidades', { silent: true });
      expect(ctx.detail()).toEqual(detail);
      expect(ctx.loading()).toBe(false);
    });

    it('membro só pendente não busca o detalhe autenticado', () => {
      auth.memberships.set([mem('PARTICIPANT', 'PENDING')]);
      ctx.setActive('h1');
      expect(hackathons.detail).not.toHaveBeenCalled();
      expect(ctx.full()).toBeNull();
    });

    it('membro aprovado (qualquer papel) carrega o detalhe autenticado', () => {
      auth.memberships.set([mem('MENTOR', 'APPROVED')]);
      ctx.setActive('h1');
      expect(hackathons.detail).toHaveBeenCalledWith('h1');
      expect(ctx.full()).toEqual(full);
      expect(ctx.teamMaxSize()).toBe(5);
    });

    it('detalhe público com erro (evento DRAFT) encerra o loading sem quebrar', () => {
      catalog.getBySlug.mockReturnValue(throwError(() => ({ statusCode: 404 })));
      auth.memberships.set([mem('ORGANIZER', 'APPROVED')]);
      ctx.setActive('h1');

      expect(ctx.loading()).toBe(false);
      expect(ctx.detail()).toBeNull();
      expect(ctx.full()).toEqual(full);
    });

    it('sem membership no evento não há resumo nem chamadas ao catálogo', () => {
      ctx.setActive('h9');
      expect(ctx.summary()).toBeNull();
      expect(catalog.getBySlug).not.toHaveBeenCalled();
      expect(hackathons.detail).not.toHaveBeenCalled();
      expect(hackathons.memberships).not.toHaveBeenCalled();
    });

    it('reativar o mesmo evento já carregado não refaz as chamadas', () => {
      auth.memberships.set([mem('PARTICIPANT', 'APPROVED')]);
      ctx.setActive('h1');
      ctx.setActive('h1');
      expect(catalog.getBySlug).toHaveBeenCalledTimes(1);
      expect(hackathons.detail).toHaveBeenCalledTimes(1);
    });

    it('trocar de evento zera o estado do anterior', () => {
      auth.memberships.set([mem('ORGANIZER', 'APPROVED', 'h1'), mem('PARTICIPANT', 'PENDING', 'h2')]);
      ctx.setActive('h1');
      expect(ctx.pendingCount()).toBe(2);

      catalog.getBySlug.mockReturnValue(throwError(() => ({ statusCode: 404 })));
      ctx.setActive('h2');
      expect(ctx.full()).toBeNull();
      expect(ctx.detail()).toBeNull();
      expect(ctx.pendingCount()).toBeNull();
    });
  });

  describe('refreshPendingCount', () => {
    it('organizador aprovado busca as memberships PENDING e guarda a contagem', () => {
      auth.memberships.set([mem('ORGANIZER', 'APPROVED')]);
      ctx.setActive('h1');

      expect(hackathons.memberships).toHaveBeenCalledWith('h1', { status: 'PENDING' });
      expect(ctx.pendingCount()).toBe(2);

      hackathons.memberships.mockReturnValue(of([]));
      ctx.refreshPendingCount();
      expect(ctx.pendingCount()).toBe(0);
    });

    it('não chama a API para quem não é organizador aprovado', () => {
      auth.memberships.set([mem('PARTICIPANT', 'APPROVED'), mem('ORGANIZER', 'PENDING')]);
      ctx.setActive('h1');
      ctx.refreshPendingCount();
      expect(hackathons.memberships).not.toHaveBeenCalled();
      expect(ctx.pendingCount()).toBeNull();
    });

    it('sem evento ativo não faz nada', () => {
      ctx.refreshPendingCount();
      expect(hackathons.memberships).not.toHaveBeenCalled();
    });

    it('erro na contagem é ignorado', () => {
      hackathons.memberships.mockReturnValue(throwError(() => ({ statusCode: 500 })));
      auth.memberships.set([mem('ORGANIZER', 'APPROVED')]);
      expect(() => ctx.setActive('h1')).not.toThrow();
      expect(ctx.pendingCount()).toBeNull();
    });
  });

  describe('applyFull / clear', () => {
    beforeEach(() => {
      auth.memberships.set([mem('ORGANIZER', 'APPROVED')]);
      ctx.setActive('h1');
    });

    it('reflete o PATCH em full, summary e detail sem refetch', () => {
      const updated: Hackathon = {
        ...full,
        name: 'Hack Renomeado',
        description: 'Nova descrição',
        registrationMode: 'CODE',
        coverImage: 'http://cdn/capa.png',
        location: null,
        price: 50,
      };
      ctx.applyFull(updated);

      expect(ctx.full()).toEqual(updated);
      expect(ctx.summary()).toMatchObject({
        name: 'Hack Renomeado',
        registrationMode: 'CODE',
        coverImage: 'http://cdn/capa.png',
        location: null,
        price: 50,
        slug: 'hack-cidades',
      });
      expect(ctx.detail()).toMatchObject({
        name: 'Hack Renomeado',
        description: 'Nova descrição',
        registrationMode: 'CODE',
        price: 50,
        challenges: [],
      });
      expect(hackathons.detail).toHaveBeenCalledTimes(1);
    });

    it('ignora summary/detail de outro evento', () => {
      ctx.applyFull({ ...full, id: 'outro', name: 'Outro' });
      expect(ctx.full()?.name).toBe('Outro');
      expect(ctx.summary()?.name).toBe('Hack Cidades');
      expect(ctx.detail()?.name).toBe('Hack Cidades');
    });

    it('clear zera o contexto', () => {
      ctx.clear();
      expect(ctx.activeId()).toBeNull();
      expect(ctx.summary()).toBeNull();
      expect(ctx.detail()).toBeNull();
      expect(ctx.full()).toBeNull();
      expect(ctx.pendingCount()).toBeNull();
    });
  });
});
