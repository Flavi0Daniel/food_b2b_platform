import { environment } from '../../../environments/environment';

/** Origem do servidor (sem "/api"). Em produção, com `apiUrl: '/api'`, fica vazia e os URLs são relativos. */
const SERVER_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

/**
 * Transforma o caminho devolvido pela API (ex: '/media/products/<uuid>.jpg') num URL completo para <img>.
 * URLs absolutos (fotos externas antigas) ficam como estão. Sem caminho devolve '' (o template usa *ngIf).
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : `${SERVER_ORIGIN}${path}`;
}
