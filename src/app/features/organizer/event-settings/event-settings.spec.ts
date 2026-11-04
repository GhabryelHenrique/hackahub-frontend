import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { EventSettings } from './event-settings';
import { AuthService } from '../../../core/auth/auth.service';
import { EventContextService } from '../../../core/event-context/event-context.service';
import { HackathonService } from '../../../core/services/hackathon.service';
import { UploadService } from '../../../core/services/upload.service';
import { ToastService } from '../../../core/toast/toast.service';
import { Hackathon, RegistrationMode, UpdateHackathonPayload } from '../../../core/models';

function hackathon(registrationMode: RegistrationMode = 'OPEN'): Hackathon {
  return {
    id: 'h1',
    organizationId: 'o1',
    name: 'Hack Cidades',
    slug: 'hack-cidades',
    description: 'Descrição',
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    registrationMode,
    coverImage: 'http://localhost:3000/uploads/capa.png',
    startsAt: '2026-11-01T12:00:00.000Z',
    endsAt: '2026-11-03T21:30:00.000Z',
    teamMaxSize: 5,
    maxParticipants: 100,
    maxMentors: null,
    location: 'São Paulo',
    price: 25,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

describe('EventSettings', () => {
  let fixture: ComponentFixture<EventSettings>;
  let el: HTMLElement;
  let toast: ToastService;

  const hackathons = { detail: vi.fn(), update: vi.fn() };
  const ctx = { applyFull: vi.fn() };
  const auth = { refresh: vi.fn() };
  const uploads = { upload: vi.fn() };

  beforeEach(() => {
    hackathons.detail.mockReset().mockReturnValue(of(hackathon()));
    hackathons.update
      .mockReset()
      .mockImplementation((_id: string, p: UpdateHackathonPayload) => of({ ...hackathon(), ...p }));
    ctx.applyFull.mockReset();
    auth.refresh.mockReset();
    uploads.upload.mockReset();

    TestBed.configureTestingModule({
      imports: [EventSettings],
      providers: [
        provideZonelessChangeDetection(),
        { provide: HackathonService, useValue: hackathons },
        { provide: EventContextService, useValue: ctx },
        { provide: AuthService, useValue: auth },
        { provide: UploadService, useValue: uploads },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
  });

  async function render() {
    fixture = TestBed.createComponent(EventSettings);
    fixture.componentRef.setInput('hackathonId', 'h1');
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const control = <T extends HTMLElement = HTMLInputElement>(name: string) => el.querySelector<T>(`[formcontrolname="${name}"]`);
  const lastPayload = (): UpdateHackathonPayload => hackathons.update.mock.calls.at(-1)![1];

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
  async function save() {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('carrega o evento e preenche o formulário', async () => {
    await render();
    expect(hackathons.detail).toHaveBeenCalledWith('h1');
    expect(control('name')!.value).toBe('Hack Cidades');
    expect(control('location')!.value).toBe('São Paulo');
    expect(control('price')!.value).toBe('25');
    expect(control('maxMentors')!.value).toBe('');
    expect(control<HTMLSelectElement>('registrationMode')!.value).toBe('OPEN');
    expect(control('registrationCode')).toBeNull();
  });

  it('salvar sem mudanças envia o payload completo, com a capa atual e sem código', async () => {
    await render();
    await save();

    expect(hackathons.update).toHaveBeenCalledWith('h1', {
      name: 'Hack Cidades',
      description: 'Descrição',
      location: 'São Paulo',
      startsAt: '2026-11-01T12:00:00.000Z',
      endsAt: '2026-11-03T21:30:00.000Z',
      registrationMode: 'OPEN',
      price: 25,
      maxParticipants: 100,
      maxMentors: null,
      teamMaxSize: 5,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      coverImage: 'http://localhost:3000/uploads/capa.png',
    });
    expect(lastPayload()).not.toHaveProperty('registrationCode');
  });

  it('após salvar reflete no contexto, recarrega a sessão e avisa', async () => {
    await render();
    await type('name', 'Hack Renomeado');
    await save();

    expect(ctx.applyFull).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1', name: 'Hack Renomeado' }));
    expect(auth.refresh).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Evento atualizado.');
  });

  it('campos limpos viram null (limpa no backend)', async () => {
    await render();
    await type('description', '   ');
    await type('location', '');
    await type('price', '');
    await type('maxParticipants', '');
    await type('startsAt', '');
    await save();

    expect(lastPayload()).toMatchObject({
      description: null,
      location: null,
      price: null,
      maxParticipants: null,
      startsAt: null,
    });
  });

  it('remover a capa envia coverImage null', async () => {
    await render();
    const remove = Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Remover')!;
    remove.click();
    await fixture.whenStable();
    await save();
    expect(lastPayload().coverImage).toBeNull();
  });

  it('nova capa enviada é usada no payload', async () => {
    uploads.upload.mockReturnValue(of({ url: 'http://localhost:3000/uploads/nova.jpg' }));
    await render();
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['img'], 'nova.jpg', { type: 'image/jpeg' })] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await save();
    expect(lastPayload().coverImage).toBe('http://localhost:3000/uploads/nova.jpg');
  });

  it('capa com tipo inválido é recusada no cliente', async () => {
    await render();
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'doc.txt', { type: 'text/plain' })] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(toast.error).toHaveBeenCalledWith('Use uma imagem PNG, JPG, WEBP ou GIF.');
    expect(uploads.upload).not.toHaveBeenCalled();
  });

  describe('código de inscrição (write-only)', () => {
    it('mudar para CODE sem código bloqueia o salvamento', async () => {
      await render();
      await choose('registrationMode', 'CODE');
      expect(control('registrationCode')).not.toBeNull();
      await save();

      expect(hackathons.update).not.toHaveBeenCalled();
      expect(text(el)).toContain('Defina o código — sem ele ninguém consegue se inscrever.');
    });

    it('mudar para CODE com código envia o código sem espaços e limpa o campo', async () => {
      hackathons.update.mockImplementation((_id: string, p: UpdateHackathonPayload) =>
        of({ ...hackathon('CODE'), ...p, registrationCode: undefined }),
      );
      await render();
      await choose('registrationMode', 'CODE');
      await type('registrationCode', '  NOVO26 ');
      await save();

      expect(lastPayload()).toMatchObject({ registrationMode: 'CODE', registrationCode: 'NOVO26' });
      expect(control('registrationCode')!.value).toBe('');

      // Agora o modo salvo é CODE: salvar de novo sem código mantém o atual.
      await save();
      expect(hackathons.update).toHaveBeenCalledTimes(2);
      expect(lastPayload()).not.toHaveProperty('registrationCode');
    });

    it('evento já em CODE salva sem código (mantém o atual)', async () => {
      hackathons.detail.mockReturnValue(of(hackathon('CODE')));
      await render();
      expect(text(el)).toContain('Preencha para definir um novo código; em branco mantém o atual.');
      await save();

      expect(hackathons.update).toHaveBeenCalledTimes(1);
      expect(lastPayload().registrationMode).toBe('CODE');
      expect(lastPayload()).not.toHaveProperty('registrationCode');
    });

    it('código digitado mas modo trocado para outro não é enviado', async () => {
      await render();
      await choose('registrationMode', 'CODE');
      await type('registrationCode', 'SEGREDO');
      await choose('registrationMode', 'APPROVAL');
      await save();

      expect(lastPayload().registrationMode).toBe('APPROVAL');
      expect(lastPayload()).not.toHaveProperty('registrationCode');
    });
  });

  it('nome vazio bloqueia o salvamento', async () => {
    await render();
    await type('name', '');
    await save();
    expect(hackathons.update).not.toHaveBeenCalled();
    expect(text(el)).toContain('Informe o nome (máx. 140 caracteres).');
  });
});
