import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DiscordService } from './discord.service';

const BASE = 'http://localhost:3000/integrations/discord';

describe('DiscordService', () => {
  let service: DiscordService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DiscordService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getLink faz GET /integrations/discord/link', () => {
    service.getLink().subscribe();
    const req = http.expectOne(`${BASE}/link`);
    expect(req.request.method).toBe('GET');
    req.flush({ linked: false, discordUsername: null });
  });

  it('generateCode faz POST /link-code', () => {
    service.generateCode().subscribe();
    const req = http.expectOne(`${BASE}/link-code`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ code: 'ABCD1234', expiresAt: '2026-10-19T12:10:00Z' });
  });

  it('unlink faz DELETE /link', () => {
    service.unlink().subscribe();
    const req = http.expectOne(`${BASE}/link`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
