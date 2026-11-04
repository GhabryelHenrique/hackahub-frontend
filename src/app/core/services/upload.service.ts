import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Tipos aceitos pela API (`uploads.constants.ts`) — manter em sincronia. */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Resposta do POST /uploads. */
export interface UploadResult {
  url: string;
}

/**
 * Upload de imagens (capa de evento / foto de perfil). Envia multipart para
 * `POST /uploads` e devolve a URL pública gravada pelo backend. O Content-Type
 * (com boundary) é definido pelo browser; o interceptor de auth injeta o Bearer.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  upload(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/uploads`, form);
  }
}
