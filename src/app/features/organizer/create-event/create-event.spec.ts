import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CreateEvent } from './create-event';
import { AuthService } from '../../../core/auth/auth.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { IMAGE_MAX_BYTES, UploadService } from '../../../core/services/upload.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Organization } from '../../../core/models';

const myOrgs: Organization[] = [
  { id: 'org1', name: 'Comunidade DevBR', slug: 'comunidade-devbr', createdAt: '', ownerId: 'u1' },
  { id: 'org2', name: 'Liga Hacker', slug: 'liga-hacker', createdAt: '', ownerId: 'u1' },
];

/** Payload base de um evento criado só com nome (demais campos nos defaults do form). */
const basePayload = {
  name: 'Hack Cidades 2026',
  slug: 'hack-cidades-2026',
  registrationMode: 'OPEN',
  teamMaxSize: 6,
  status: 'DRAFT',
  visibility: 'PUBLIC',
  startsAt: null,
  endsAt: null,
  maxParticipants: null,
  maxMentors: null,
  price: null,
  location: null,
};

describe('CreateEvent', () => {
  let fixture: ComponentFixture<CreateEvent>;
  let el: HTMLElement;
  let router: Router;
  let toast: ToastService;

  const orgs = { mine: vi.fn(), create: vi.fn() };
  const hackathons = { create: vi.fn() };
  const uploads = { upload: vi.fn() };
  const users = { updateProfile: vi.fn() };
  const auth = {
    user: signal<{ id: string; name: string; avatarUrl: string | null } | null>(null),
    reload: vi.fn(),
  };

  beforeEach(() => {
    orgs.mine.mockReset().mockReturnValue(of([]));
    orgs.create.mockReset().mockReturnValue(of({ id: 'org-new', name: 'Comunidade Ação', slug: 'comunidade-acao' }));
    hackathons.create.mockReset().mockReturnValue(of({ id: 'h-new' }));
    uploads.upload.mockReset();
    users.updateProfile.mockReset().mockReturnValue(of({}));
    auth.reload.mockReset().mockReturnValue(of({}));
    auth.user.set({ id: 'u1', name: 'Ana Souza', avatarUrl: null });

    TestBed.configureTestingModule({
      imports: [CreateEvent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrganizationService, useValue: orgs },
        { provide: HackathonService, useValue: hackathons },
        { provide: UploadService, useValue: uploads },
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
  });

  async function render() {
    fixture = TestBed.createComponent(CreateEvent);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const control = <T extends HTMLElement = HTMLInputElement>(name: string) => el.querySelector<T>(`[formcontrolname="${name}"]`);

  async function type(name: string, value: string) {
    const input = control(name)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function choose(name: string, value: string) {
    const select = control<HTMLSelectElement>(name)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  async function pickFile(index: number, file: File) {
    const input = el.querySelectorAll<HTMLInputElement>('input[type="file"]')[index];
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  describe('com organizações próprias', () => {
    beforeEach(async () => {
      orgs.mine.mockReturnValue(of(myOrgs));
      await render();
    });

    it('começa no modo "usar uma organização sua" com a primeira selecionada', () => {
      expect(orgs.mine).toHaveBeenCalled();
      const radio = el.querySelector('[role="radio"][aria-checked="true"]');
      expect(text(radio)).toContain('Usar uma organização sua');
      expect(control<HTMLSelectElement>('orgId')!.value).toBe('org1');
      expect(control('orgName')).toBeNull();
    });

    it('cria o evento direto sob a organização escolhida, sem POST /organizations', async () => {
      await choose('orgId', 'org2');
      await type('name', 'Hack Cidades 2026');
      await submit();

      expect(orgs.create).not.toHaveBeenCalled();
      expect(hackathons.create).toHaveBeenCalledWith({ organizationId: 'org2', ...basePayload });
      expect(auth.reload).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/app/eventos', 'h-new', 'gerenciar']);
      expect(toast.success).toHaveBeenCalledWith('Evento criado! Agora ajuste os detalhes e publique quando quiser.');
    });

    it('pode alternar para criar uma organização nova', async () => {
      const newOrg = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) =>
        text(b).includes('Criar nova organização'),
      )!;
      newOrg.click();
      await fixture.whenStable();
      expect(control('orgName')).not.toBeNull();

      // Sem nome da organização o formulário não envia.
      await type('name', 'Hack Cidades 2026');
      await submit();
      expect(orgs.create).not.toHaveBeenCalled();
      expect(hackathons.create).not.toHaveBeenCalled();

      await type('orgName', 'Comunidade Ação');
      await submit();
      expect(orgs.create).toHaveBeenCalledWith({ name: 'Comunidade Ação', slug: 'comunidade-acao' });
      expect(hackathons.create).toHaveBeenCalledWith({ organizationId: 'org-new', ...basePayload });
    });
  });

  describe('sem organizações', () => {
    beforeEach(render);

    it('começa no modo de nova organização, sem seletor', () => {
      expect(el.querySelector('[role="radiogroup"]')).toBeNull();
      expect(control('orgName')).not.toBeNull();
    });

    it('gera os slugs a partir dos nomes', async () => {
      await type('orgName', 'Comunidade Ação');
      await type('name', 'Hack Cidades 2026!');
      expect(control('orgSlug')!.value).toBe('comunidade-acao');
      expect(control('slug')!.value).toBe('hack-cidades-2026');
    });

    it('slug editado à mão deixa de acompanhar o nome', async () => {
      await type('name', 'Hack Cidades');
      await type('slug', 'Meu Slug');
      expect(control('slug')!.value).toBe('meu-slug');
      await type('name', 'Outro nome');
      expect(control('slug')!.value).toBe('meu-slug');
    });

    it('cria a organização e depois o evento sob ela', async () => {
      await type('orgName', 'Comunidade Ação');
      await type('name', 'Hack Cidades 2026');
      await submit();

      expect(orgs.create).toHaveBeenCalledWith({ name: 'Comunidade Ação', slug: 'comunidade-acao' });
      expect(hackathons.create).toHaveBeenCalledWith({ organizationId: 'org-new', ...basePayload });
      expect(router.navigate).toHaveBeenCalledWith(['/app/eventos', 'h-new', 'gerenciar']);
    });

    it('converte campos opcionais (trim, inteiros, preço em 2 casas, datas ISO)', async () => {
      await type('orgName', 'Org');
      await type('name', '  Hack Cidades 2026  ');
      await type('description', '  Descrição completa  ');
      await type('location', '  São Paulo  ');
      await type('price', '49.999');
      await type('maxParticipants', '100.7');
      await type('maxMentors', '10');
      await type('startsAt', '2026-11-01T09:00');
      await type('endsAt', '2026-11-03T18:30');
      await submit();

      expect(hackathons.create).toHaveBeenCalledWith({
        ...basePayload,
        organizationId: 'org-new',
        description: 'Descrição completa',
        location: 'São Paulo',
        price: 50,
        maxParticipants: 100,
        maxMentors: 10,
        startsAt: new Date('2026-11-01T09:00').toISOString(),
        endsAt: new Date('2026-11-03T18:30').toISOString(),
      });
    });

    it('encerramento antes do início bloqueia o envio', async () => {
      await type('orgName', 'Org');
      await type('name', 'Hack');
      await type('startsAt', '2026-11-03T09:00');
      await type('endsAt', '2026-11-01T09:00');
      await submit();

      expect(orgs.create).not.toHaveBeenCalled();
      expect(text(el)).toContain('O encerramento não pode ser antes do início.');
    });

    it('modo CODE sem código bloqueia; com código envia sem espaços', async () => {
      await type('orgName', 'Org');
      await type('name', 'Hack Cidades 2026');
      await choose('registrationMode', 'CODE');
      expect(control('registrationCode')).not.toBeNull();

      await submit();
      expect(orgs.create).not.toHaveBeenCalled();
      expect(hackathons.create).not.toHaveBeenCalled();
      expect(text(el)).toContain('Defina o código — sem ele ninguém consegue se inscrever.');

      await type('registrationCode', '  SEGREDO26 ');
      await submit();
      expect(hackathons.create).toHaveBeenCalledWith(
        expect.objectContaining({ registrationMode: 'CODE', registrationCode: 'SEGREDO26' }),
      );
    });

    it('código preenchido com modo diferente de CODE não é enviado', async () => {
      await type('orgName', 'Org');
      await type('name', 'Hack');
      await choose('registrationMode', 'CODE');
      await type('registrationCode', 'SEGREDO');
      await choose('registrationMode', 'APPROVAL');
      await submit();

      const payload = hackathons.create.mock.calls[0][0];
      expect(payload.registrationMode).toBe('APPROVAL');
      expect(payload).not.toHaveProperty('registrationCode');
    });

    it('slug de organização em uso (409) mostra erro inline e não cria o evento', async () => {
      orgs.create.mockReturnValue(throwError(() => ({ statusCode: 409, message: 'Slug em uso' })));
      await type('orgName', 'Comunidade Ação');
      await type('name', 'Hack');
      await submit();

      expect(hackathons.create).not.toHaveBeenCalled();
      expect(text(el)).toContain('Já existe uma organização com este identificador.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('após falha do evento (409), o retry reaproveita a organização já criada', async () => {
      hackathons.create.mockReturnValueOnce(throwError(() => ({ statusCode: 409 })));
      await type('orgName', 'Comunidade Ação');
      await type('name', 'Hack');
      await submit();
      expect(text(el)).toContain('Já existe um evento com este identificador. Escolha outro.');

      await type('slug', 'hack-2');
      await submit();
      expect(orgs.create).toHaveBeenCalledTimes(1);
      expect(hackathons.create).toHaveBeenCalledTimes(2);
      expect(hackathons.create.mock.calls[1][0]).toMatchObject({ organizationId: 'org-new', slug: 'hack-2' });
    });
  });

  describe('imagens', () => {
    beforeEach(render);

    it('rejeita tipos fora da lista (MIME) sem enviar', async () => {
      await pickFile(0, new File(['%PDF'], 'capa.pdf', { type: 'application/pdf' }));
      expect(toast.error).toHaveBeenCalledWith('Use uma imagem PNG, JPG, WEBP ou GIF.');
      expect(uploads.upload).not.toHaveBeenCalled();

      await pickFile(0, new File(['<svg/>'], 'capa.svg', { type: 'image/svg+xml' }));
      expect(uploads.upload).not.toHaveBeenCalled();
    });

    it('rejeita imagens acima de 5 MB', async () => {
      const big = new File(['x'], 'grande.png', { type: 'image/png' });
      Object.defineProperty(big, 'size', { value: IMAGE_MAX_BYTES + 1 });
      await pickFile(0, big);
      expect(toast.error).toHaveBeenCalledWith('A imagem deve ter no máximo 5 MB.');
      expect(uploads.upload).not.toHaveBeenCalled();
    });

    it('envia a capa válida e inclui a URL no payload', async () => {
      uploads.upload.mockReturnValue(of({ url: 'http://localhost:3000/uploads/capa.webp' }));
      const file = new File(['img'], 'capa.webp', { type: 'image/webp' });
      await pickFile(0, file);
      expect(uploads.upload).toHaveBeenCalledWith(file);

      await type('orgName', 'Org');
      await type('name', 'Hack');
      await submit();
      expect(hackathons.create.mock.calls[0][0].coverImage).toBe('http://localhost:3000/uploads/capa.webp');
    });

    it('foto de perfil trocada é salva antes de recarregar a sessão', async () => {
      uploads.upload.mockReturnValue(of({ url: 'http://localhost:3000/uploads/eu.png' }));
      await pickFile(1, new File(['img'], 'eu.png', { type: 'image/png' }));

      await type('orgName', 'Org');
      await type('name', 'Hack');
      await submit();

      expect(users.updateProfile).toHaveBeenCalledWith({ avatarUrl: 'http://localhost:3000/uploads/eu.png' });
      expect(auth.reload).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/app/eventos', 'h-new', 'gerenciar']);
    });

    it('sem troca de foto não atualiza o perfil', async () => {
      await type('orgName', 'Org');
      await type('name', 'Hack');
      await submit();
      expect(users.updateProfile).not.toHaveBeenCalled();
    });
  });
});
