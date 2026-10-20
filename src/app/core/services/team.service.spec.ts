import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamService } from './team.service';
import { Invite, JoinRequest } from '../models';

const API = 'http://localhost:3000';
const HB = `${API}/hackathons/h1`;

describe('TeamService', () => {
  let service: TeamService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeamService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectReq(method: string, url: string, body?: unknown) {
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe(method);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    return req;
  }

  it('list faz GET /teams com search opcional', () => {
    service.list('h1').subscribe();
    let req = expectReq('GET', `${HB}/teams`);
    expect(req.request.params.has('search')).toBe(false);
    req.flush([]);

    service.list('h1', 'robôs').subscribe();
    req = expectReq('GET', `${HB}/teams`);
    expect(req.request.params.get('search')).toBe('robôs');
    req.flush([]);
  });

  it('get e create', () => {
    service.get('h1', 't1').subscribe();
    expectReq('GET', `${HB}/teams/t1`).flush({});

    service.create('h1', { name: 'Os Inovadores', description: 'IA' }).subscribe();
    expectReq('POST', `${HB}/teams`, { name: 'Os Inovadores', description: 'IA' }).flush({});
  });

  it('selectChallenges usa POST (não PUT) com challengeIds', () => {
    service.selectChallenges('h1', 't1', ['c1', 'c2']).subscribe();
    expectReq('POST', `${HB}/teams/t1/challenges`, { challengeIds: ['c1', 'c2'] }).flush({});
  });

  it('removeMember faz DELETE no membro', () => {
    service.removeMember('h1', 't1', 'u2').subscribe();
    expectReq('DELETE', `${HB}/teams/t1/members/u2`).flush({ message: 'ok' });
  });

  it('searchParticipants envia o termo em search', () => {
    service.searchParticipants('h1', 'ana').subscribe();
    const req = expectReq('GET', `${HB}/participants`);
    expect(req.request.params.get('search')).toBe('ana');
    req.flush([]);
  });

  it('invite envia toUserId', () => {
    service.invite('h1', 't1', 'u9').subscribe();
    expectReq('POST', `${HB}/teams/t1/invites`, { toUserId: 'u9' }).flush({});
  });

  it('requestJoin, approveRequest e rejectRequest', () => {
    service.requestJoin('h1', 't1').subscribe();
    expectReq('POST', `${HB}/teams/t1/join-requests`, {}).flush({});

    service.approveRequest('h1', 'r1').subscribe();
    expectReq('POST', `${HB}/join-requests/r1/approve`, {}).flush({});

    service.rejectRequest('h1', 'r2').subscribe();
    expectReq('POST', `${HB}/join-requests/r2/reject`, {}).flush({});
  });

  it('teamJoinRequests devolve apenas as solicitações PENDING', () => {
    const all = [
      { id: 'r1', status: 'PENDING' },
      { id: 'r2', status: 'APPROVED' },
      { id: 'r3', status: 'REJECTED' },
      { id: 'r4', status: 'PENDING' },
    ] as JoinRequest[];
    let result: JoinRequest[] = [];
    service.teamJoinRequests('h1', 't1').subscribe((r) => (result = r));
    expectReq('GET', `${HB}/teams/t1/join-requests`).flush(all);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r4']);
  });

  it('receivedInvites devolve apenas os convites PENDING', () => {
    const all = [
      { id: 'i1', status: 'ACCEPTED' },
      { id: 'i2', status: 'PENDING' },
      { id: 'i3', status: 'DECLINED' },
      { id: 'i4', status: 'CANCELLED' },
    ] as Invite[];
    let result: Invite[] = [];
    service.receivedInvites('h1').subscribe((r) => (result = r));
    expectReq('GET', `${HB}/invites/received`).flush(all);
    expect(result.map((i) => i.id)).toEqual(['i2']);
  });

  it('acceptInvite e declineInvite', () => {
    service.acceptInvite('h1', 'i1').subscribe();
    expectReq('POST', `${HB}/invites/i1/accept`, {}).flush({});

    service.declineInvite('h1', 'i2').subscribe();
    expectReq('POST', `${HB}/invites/i2/decline`, {}).flush({});
  });
});
