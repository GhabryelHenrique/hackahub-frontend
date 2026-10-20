import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { of } from 'rxjs';
import { Profile } from './profile';
import { AuthService } from '../../core/auth/auth.service';
import { DiscordService } from '../../core/services/discord.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/toast/toast.service';
import { CurrentUser } from '../../core/models';

const user: CurrentUser = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@hackahub.local',
  documentId: '12345678900',
  phone: '11999990000',
  birthDate: '2000-01-01T12:00:00Z',
  acceptedTerms: true,
  institution: 'USP',
  course: null,
  githubUrl: 'https://github.com/ana',
  linkedinUrl: null,
  createdAt: '2026-01-01T12:00:00Z',
};

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let el: HTMLElement;
  let toast: ToastService;

  const users = { updateProfile: vi.fn() };
  const auth = { user: signal<CurrentUser | null>(user), applyUser: vi.fn() };
  const discord = { getLink: vi.fn(), generateCode: vi.fn(), unlink: vi.fn() };

  beforeEach(async () => {
    users.updateProfile.mockReset();
    auth.applyUser.mockReset();
    auth.user.set(user);
    discord.getLink.mockReset().mockReturnValue(of({ linked: false, discordUsername: null }));
    discord.generateCode.mockReset();
    discord.unlink.mockReset();

    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideZonelessChangeDetection(),
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: auth },
        { provide: DiscordService, useValue: discord },
      ],
    });
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
  });

  async function render() {
    fixture = TestBed.createComponent(Profile);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  const text = (n: Element | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const control = (name: string) => el.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`)!;
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => text(b) === label);
  async function type(name: string, value: string) {
    control(name).value = value;
    control(name).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function save() {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('preenche o formulário com o usuário da sessão (nulos viram vazio)', async () => {
    await render();
    expect(control('name').value).toBe('Ana Souza');
    expect(control('phone').value).toBe('11999990000');
    expect(control('course').value).toBe('');
    expect(control('linkedinUrl').value).toBe('');
    expect(text(el.querySelector('.profile__identity'))).toContain('ana@hackahub.local');
  });

  it('salvar envia só os campos editáveis e reflete na sessão', async () => {
    const updated = { ...user, course: 'Computação', phone: '11888887777' };
    users.updateProfile.mockReturnValue(of(updated));
    await render();
    await type('course', 'Computação');
    await type('phone', '11888887777');
    await save();

    expect(users.updateProfile).toHaveBeenCalledWith({
      name: 'Ana Souza',
      phone: '11888887777',
      institution: 'USP',
      course: 'Computação',
      githubUrl: 'https://github.com/ana',
      linkedinUrl: '',
    });
    expect(auth.applyUser).toHaveBeenCalledWith(updated);
    expect(toast.success).toHaveBeenCalledWith('Perfil atualizado.');
  });

  it('nome vazio bloqueia o envio', async () => {
    await render();
    await type('name', '');
    await save();
    expect(users.updateProfile).not.toHaveBeenCalled();
    expect(text(el)).toContain('Informe seu nome.');
  });

  describe('Discord', () => {
    it('sem vínculo gera o código de /vincular', async () => {
      discord.generateCode.mockReturnValue(of({ code: 'ABCD1234', expiresAt: '2026-10-19T12:10:00Z' }));
      await render();
      expect(discord.getLink).toHaveBeenCalled();

      button('Gerar código')!.click();
      await fixture.whenStable();
      expect(text(el.querySelector('.profile__code'))).toBe('/vincular codigo:ABCD1234');
      expect(button('Gerar novo código')).toBeTruthy();
    });

    it('vinculado mostra o usuário e permite desvincular', async () => {
      discord.getLink.mockReturnValue(of({ linked: true, discordUsername: 'ana.dev' }));
      discord.unlink.mockReturnValue(of(undefined));
      await render();
      expect(text(el.querySelector('.profile__discord'))).toContain('@ana.dev');

      button('Desvincular')!.click();
      await fixture.whenStable();
      expect(discord.unlink).toHaveBeenCalled();
      expect(button('Gerar código')).toBeTruthy();
      expect(toast.success).toHaveBeenCalledWith('Conta do Discord desvinculada.');
    });
  });
});
