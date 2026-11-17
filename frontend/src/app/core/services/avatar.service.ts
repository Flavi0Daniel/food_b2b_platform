import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { mediaUrl } from '../utils/media-url';

/**
 * Os avatares são PRIVADOS (só o próprio e a equipa os abrem), por isso exigem o token e não podem ir
 * direto num <img src>. Este serviço pede a imagem com autenticação e devolve um URL local (blob:).
 * Cada avatar só é descarregado uma vez (o URL muda quando a imagem muda).
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly pending = new Map<string, Observable<string>>();
  private readonly resolved = new Map<string, string>();

  constructor(private readonly http: HttpClient) {}

  /** `avatarUrl` é o caminho devolvido pela API (ex: '/api/files/avatars/<uuid>.jpg'). */
  objectUrl(avatarUrl: string): Observable<string> {
    const existing = this.pending.get(avatarUrl);
    if (existing) return existing;

    const request$ = this.http.get(mediaUrl(avatarUrl), { responseType: 'blob' }).pipe(
      map((blob) => URL.createObjectURL(blob)),
      tap((url) => this.resolved.set(avatarUrl, url)),
      catchError((err) => {
        this.pending.delete(avatarUrl); // permite tentar de novo mais tarde
        return throwError(() => err);
      }),
      shareReplay(1),
    );
    this.pending.set(avatarUrl, request$);
    return request$;
  }

  /** Ao terminar sessão: liberta a memória e esquece as imagens do utilizador anterior. */
  clear(): void {
    this.resolved.forEach((url) => URL.revokeObjectURL(url));
    this.resolved.clear();
    this.pending.clear();
  }
}
