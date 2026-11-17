import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AvatarService } from '../../../core/services/avatar.service';
import { initialsOf } from '../../../core/utils/initials';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

/**
 * Avatar/logo do utilizador, ou as iniciais quando não há imagem (ou ainda está a carregar).
 *
 *   <app-avatar [name]="user.companyName || user.name" [src]="user.avatarUrl" size="sm"></app-avatar>
 *
 * `src` é o `avatarUrl` devolvido pela API. A imagem é privada: só aparece ao próprio e à equipa.
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  host: { class: 'inline-block shrink-0' },
})
export class AvatarComponent implements OnChanges, OnDestroy {
  @Input() name = '';
  @Input() src: string | null | undefined = null;
  @Input() size: AvatarSize = 'md';

  imageUrl: SafeUrl | null = null;
  private subscription: Subscription | null = null;

  constructor(
    private readonly avatars: AvatarService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  get initials(): string {
    return initialsOf(this.name);
  }

  get sizeClasses(): string {
    return SIZE_CLASSES[this.size];
  }

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    this.imageUrl = null;
    if (!this.src) return;

    this.subscription = this.avatars.objectUrl(this.src).subscribe({
      // O URL blob: foi criado por nós a partir da resposta autenticada da API, por isso é seguro.
      next: (url) => (this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(url)),
      error: () => (this.imageUrl = null),
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
