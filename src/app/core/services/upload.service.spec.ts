import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IMAGE_ACCEPT, IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UploadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('upload envia multipart com o campo "file" e devolve a URL', () => {
    const file = new File(['png'], 'capa.png', { type: 'image/png' });
    let url = '';
    service.upload(file).subscribe((r) => (url = r.url));

    const req = http.expectOne('http://localhost:3000/uploads');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    const sent = body.get('file') as File;
    expect(sent).toBeInstanceOf(File);
    expect(sent.name).toBe('capa.png');
    expect(sent.type).toBe('image/png');
    // O Content-Type (com boundary) fica a cargo do browser.
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({ url: 'http://localhost:3000/uploads/abc.png' });
    expect(url).toBe('http://localhost:3000/uploads/abc.png');
  });

  it('exporta os tipos aceitos, o accept e o limite de 5 MB', () => {
    expect(IMAGE_MIME_TYPES).toEqual(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    expect(IMAGE_ACCEPT).toBe('image/png,image/jpeg,image/webp,image/gif');
    expect(IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});
