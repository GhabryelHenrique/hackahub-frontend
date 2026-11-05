import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HackathonService } from './hackathon.service';
import { CreateHackathonPayload } from '../models';

const API = 'http://localhost:3000';

describe('HackathonService', () => {
  let service: HackathonService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HackathonService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectReq(method: string, url: string, body?: unknown) {
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe(method);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    return req;
  }

  it('create faz POST /hackathons com o payload', () => {
    const payload: CreateHackathonPayload = { organizationId: 'org1', name: 'Hack', slug: 'hack', teamMaxSize: 5 };
    let id = '';
    service.create(payload).subscribe((h) => (id = h.id));
    expectReq('POST', `${API}/hackathons`, payload).flush({ id: 'h1' });
    expect(id).toBe('h1');
  });

  it('detail faz GET /hackathons/:id', () => {
    service.detail('h1').subscribe();
    expectReq('GET', `${API}/hackathons/h1`).flush({});
  });

  it('update faz PATCH /hackathons/:id preservando nulls', () => {
    const payload = { name: 'Novo', location: null, price: null };
    service.update('h1', payload).subscribe();
    expectReq('PATCH', `${API}/hackathons/h1`, payload).flush({});
  });

  it('challenges e challenge fazem GET escopado no evento', () => {
    service.challenges('h1').subscribe();
    expectReq('GET', `${API}/hackathons/h1/challenges`).flush([]);

    service.challenge('h1', 'c9').subscribe();
    expectReq('GET', `${API}/hackathons/h1/challenges/c9`).flush({});
  });

  it('CRUD de desafios usa POST/PATCH/DELETE', () => {
    const payload = { title: 'IA', description: 'Desc', category: 'Tech' };
    service.createChallenge('h1', payload).subscribe();
    expectReq('POST', `${API}/hackathons/h1/challenges`, payload).flush({});

    service.updateChallenge('h1', 'c1', { title: 'IA 2' }).subscribe();
    expectReq('PATCH', `${API}/hackathons/h1/challenges/c1`, { title: 'IA 2' }).flush({});

    service.deleteChallenge('h1', 'c1').subscribe();
    expectReq('DELETE', `${API}/hackathons/h1/challenges/c1`).flush(null);
  });

  it('memberships sem filtro não envia query params', () => {
    service.memberships('h1').subscribe();
    const req = expectReq('GET', `${API}/hackathons/h1/memberships`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('memberships envia role e status apenas quando informados', () => {
    service.memberships('h1', { status: 'PENDING' }).subscribe();
    let req = expectReq('GET', `${API}/hackathons/h1/memberships`);
    expect(req.request.params.keys()).toEqual(['status']);
    expect(req.request.params.get('status')).toBe('PENDING');
    req.flush([]);

    service.memberships('h1', { role: 'MENTOR' }).subscribe();
    req = expectReq('GET', `${API}/hackathons/h1/memberships`);
    expect(req.request.params.keys()).toEqual(['role']);
    expect(req.request.params.get('role')).toBe('MENTOR');
    req.flush([]);

    service.memberships('h1', { role: 'PARTICIPANT', status: 'APPROVED' }).subscribe();
    req = expectReq('GET', `${API}/hackathons/h1/memberships`);
    expect(req.request.params.get('role')).toBe('PARTICIPANT');
    expect(req.request.params.get('status')).toBe('APPROVED');
    req.flush([]);
  });

  it('approveMembership e rejectMembership fazem POST nas URLs de decisão', () => {
    service.approveMembership('h1', 'm1').subscribe();
    expectReq('POST', `${API}/hackathons/h1/memberships/m1/approve`, {}).flush({});

    service.rejectMembership('h1', 'm2').subscribe();
    expectReq('POST', `${API}/hackathons/h1/memberships/m2/reject`, {}).flush({});
  });

  it('myMemberships faz GET /memberships/me', () => {
    service.myMemberships('h1').subscribe();
    expectReq('GET', `${API}/hackathons/h1/memberships/me`).flush([]);
  });

  it('leave faz DELETE /memberships/me (cancelar inscrição)', () => {
    let deleted = false;
    service.leave('h1').subscribe((r) => (deleted = r.teamDeleted));
    expectReq('DELETE', `${API}/hackathons/h1/memberships/me`).flush({
      message: 'ok',
      roles: ['PARTICIPANT'],
      teamId: 't1',
      teamDeleted: true,
      releasedMentorshipIds: [],
    });
    expect(deleted).toBe(true);
  });

  it('join envia o código de inscrição (ou undefined)', () => {
    service.join('h1', 'SEGREDO').subscribe();
    expectReq('POST', `${API}/hackathons/h1/join`, { registrationCode: 'SEGREDO' }).flush({});

    service.join('h1').subscribe();
    const req = expectReq('POST', `${API}/hackathons/h1/join`);
    expect(req.request.body.registrationCode).toBeUndefined();
    req.flush({});
  });

  it('applyMentor faz POST /apply-mentor com a candidatura', () => {
    const application = { expertise: ['Backend'], seniority: 'Pleno', motivation: 'Quero ajudar os times.' };
    service.applyMentor('h1', application).subscribe();
    expectReq('POST', `${API}/hackathons/h1/apply-mentor`, application).flush({});
  });
});
