import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MentorshipService } from './mentorship.service';

const BASE = 'http://localhost:3000/hackathons/h1/mentorship';

describe('MentorshipService', () => {
  let service: MentorshipService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MentorshipService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectReq(method: string, url: string, body?: unknown) {
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe(method);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    return req;
  }

  it('list sem status não envia query params', () => {
    service.list('h1').subscribe();
    const req = expectReq('GET', BASE);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('list com status envia o filtro', () => {
    service.list('h1', 'PENDING').subscribe();
    const req = expectReq('GET', BASE);
    expect(req.request.params.get('status')).toBe('PENDING');
    req.flush([]);
  });

  it('mine faz GET /mentorship/mine', () => {
    service.mine('h1').subscribe();
    expectReq('GET', `${BASE}/mine`).flush([]);
  });

  it('create faz POST com título e descrição', () => {
    const payload = { title: 'Deploy falhando', description: 'O build quebra na Vercel.' };
    service.create('h1', payload).subscribe();
    expectReq('POST', BASE, payload).flush({});
  });

  it('claim, complete e cancel fazem POST nas ações do ticket', () => {
    service.claim('h1', 'r1').subscribe();
    expectReq('POST', `${BASE}/r1/claim`, {}).flush({});

    service.complete('h1', 'r1').subscribe();
    expectReq('POST', `${BASE}/r1/complete`, {}).flush({});

    service.cancel('h1', 'r2').subscribe();
    expectReq('POST', `${BASE}/r2/cancel`, {}).flush({});
  });
});
