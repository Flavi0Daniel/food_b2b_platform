import { Component, Input } from '@angular/core';

export type IconName =
  | 'bell'
  | 'menu'
  | 'x'
  | 'layout-dashboard'
  | 'shopping-cart'
  | 'credit-card'
  | 'package'
  | 'factory'
  | 'truck'
  | 'users'
  | 'user'
  | 'clipboard-list'
  | 'map-pin'
  | 'tag'
  | 'log-out';

/**
 * Ícones em SVG inline (desenho "Lucide", licença ISC), sem dependências: não precisam de
 * pacote, de registo de ícones nem de API de terceiros. O tamanho vem das classes do elemento:
 *
 *   <app-icon name="bell" class="h-5 w-5"></app-icon>
 *
 * `name` é tipado: um nome errado falha na compilação. Para acrescentar um ícone, junta o nome a
 * `IconName` e um bloco `*ngSwitchCase` em icon.component.html.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  host: { class: 'inline-flex shrink-0' },
})
export class IconComponent {
  @Input() name!: IconName;
}
