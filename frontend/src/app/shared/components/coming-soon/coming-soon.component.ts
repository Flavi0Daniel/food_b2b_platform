import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder genérico para secções já presentes na navegação mas ainda por construir.
 * O título vem de `data.pageTitle` na rota.
 */
@Component({
  selector: 'app-coming-soon',
  template: `
    <div class="bg-white border rounded-lg p-10 text-center">
      <p class="text-gray-400 text-sm mb-1">Em construção</p>
      <h2 class="text-lg font-medium text-gray-700">{{ pageTitle }}</h2>
    </div>
  `,
})
export class ComingSoonComponent implements OnInit {
  pageTitle = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.pageTitle = (this.route.snapshot.data['pageTitle'] as string) ?? '';
  }
}
