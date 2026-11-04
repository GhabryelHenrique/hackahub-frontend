import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MentorService } from './mentor.service';

const BASE = 'http://localhost:3000/hackathons/h1/mentor/teams';

describe('MentorService', () => {
  let service: MentorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MentorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('teams faz GET /mentor/teams', () => {
    let count = -1;
    service.teams('h1').subscribe((t) => (count = t.length));
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 't1' }, { id: 't2' }]);
    expect(count).toBe(2);
  });

  it('assign faz POST /mentor/teams/:teamId/assign', () => {
    service.assign('h1', 't1').subscribe();
    const req = http.expectOne(`${BASE}/t1/assign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 't1' });
  });
});
