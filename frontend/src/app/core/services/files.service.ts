import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Os comprovativos e provas de entrega são PRIVADOS: a API só os serve a quem tem o token.
 * Um <a href> ou <img src> não envia o cabeçalho Authorization (e o caminho relativo apontaria
 * para a porta do frontend), por isso o ficheiro é pedido via HttpClient (o interceptor junta o
 * token) e aberto como blob.
 */
@Injectable({ providedIn: 'root' })
export class FilesService {
  constructor(private readonly http: HttpClient) {}

  /** `path` é o que a API devolve, ex: "/api/files/payments/<uuid>.jpg". */
  open(path: string | null | undefined): void {
    if (!path) return;

    // Abre a janela já, dentro do clique do utilizador, para o browser não bloquear o popup.
    const win = window.open('', '_blank');
    const url = path.startsWith('http') ? path : `${new URL(environment.apiUrl).origin}${path}`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        if (win) {
          win.location.href = objectUrl;
        } else {
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = 'ficheiro';
          link.click();
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => {
        win?.close();
        alert('Não foi possível abrir o ficheiro.');
      },
    });
  }
}
