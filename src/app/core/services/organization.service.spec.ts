import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrganizationService } from './organization.service';
import { Organization } from '../models';

const API = 'http://localhost:3000';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('create faz POST /organizations com nome e slug', () => {
    const payload = { name: 'Comunidade DevBR', slug: 'comunidade-devbr' };
    let org: Organization | undefined;
    service.create(payload).subscribe((o) => (org = o));

    const req = http.expectOne(`${API}/organizations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'o1', ...payload, createdAt: '2026-01-01T00:00:00Z', ownerId: 'u1' });
    expect(org?.id).toBe('o1');
  });

  it('mine faz GET /organizations/mine', () => {
    let list: Organization[] = [];
    service.mine().subscribe((l) => (list = l));

    const req = http.expectOne(`${API}/organizations/mine`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'o1' }]);
    expect(list.length).toBe(1);
  });
});
