import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { CurrentUser } from '../models';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('updateProfile faz PATCH /users/me e desembrulha { user }', () => {
    let user: CurrentUser | undefined;
    service.updateProfile({ phone: '11999990000', avatarUrl: 'http://cdn/eu.png' }).subscribe((u) => (user = u));

    const req = http.expectOne('http://localhost:3000/users/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '11999990000', avatarUrl: 'http://cdn/eu.png' });
    req.flush({ user: { id: 'u1', name: 'Ana', phone: '11999990000' } });
    expect(user).toEqual({ id: 'u1', name: 'Ana', phone: '11999990000' });
  });
});
